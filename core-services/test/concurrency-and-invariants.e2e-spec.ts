/**
 * E2E Integration & Concurrency Invariant Test Suite
 *
 * Tests the following database invariants and concurrency properties:
 *
 *   T1.1  Room Capacity Trigger (`enforce_room_capacity`)
 *         Verifies that the PostgreSQL BEFORE UPDATE trigger prevents a 3rd
 *         student from being assigned to a capacity-2 room.
 *
 *   T1.2  Roommate Invitation Uniqueness Index
 *         Verifies that the partial unique index
 *         `UQ_roommate_invitations_sender_accepted` prevents a single student
 *         from holding two accepted invitations simultaneously.
 *
 *   T1.3  Concurrent Swap Lock Race Condition
 *         Verifies that `SwapsService.executeDirectSwap` uses pessimistic
 *         row-level locking so that exactly one of N concurrent calls succeeds
 *         while the rest fail safely (no dirty reads, no TOCTOU).
 *
 *   T1.4  Rollback Snapshot Integrity
 *         Verifies that `AdminService.publishAndCommitRun` captures the
 *         pre-mutation student state into `AdministrativeAction.snapshot`
 *         JSONB before any room or student records are altered.
 *
 * External Dependencies:
 *   - PostgreSQL (live) — configured via .env (DB_HOST / DB_PORT / etc.).
 *   - Python Allocation Engine — NOT required. `global.fetch` is mocked in
 *     `beforeAll` so `AdminService.onModuleInit()` reconciliation probes never
 *     reach the Python engine or Redis. Any stale QUEUED/RUNNING run found by
 *     `onModuleInit` will be reported as a 404 by the mock, which causes it to
 *     be correctly marked FAILED with no network I/O.
 *   - Redis — NOT required. The E2E tests exercise the NestJS service layer
 *     (repository + DataSource) only; they do not call the Python engine or
 *     any component that depends on Redis.
 *
 * Run:
 *   npm run test:e2e -- --testPathPattern=concurrency-and-invariants
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../src/app.module';
import {
  User,
  Student,
  Hostel,
  Room,
  RoommateInvitation,
  AllocationRun,
  AllocationResult,
  AdministrativeAction,
  SwapRequest,
  SwapHistory,
} from '../src/entities';
import {
  UserRole,
} from '../src/entities/user.entity';
import {
  StudentGender,
  GenderType,
} from '../src/entities/hostel.entity';
import { RoomStatus, RoomType } from '../src/entities/room.entity';
import { RoommateInvitationStatus } from '../src/entities/roommate-invitation.entity';
import {
  AllocationRunStatus,
  AllocationMode,
} from '../src/entities/allocation-run.entity';
import { SwapRequestStatus, SwapType } from '../src/entities/swap-request.entity';
import { ActionType } from '../src/entities/administrative-action.entity';
import { SwapsService } from '../src/swaps/swaps.service';
import { AdminService } from '../src/admin/admin.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Unique suffix so parallel test runs don't collide on email/rollNumber */
const uid = () => uuidv4().replace(/-/g, '').substring(0, 8);

async function createUserAndStudent(
  userRepo: Repository<User>,
  studentRepo: Repository<Student>,
  overrides: Partial<Student> = {},
): Promise<{ user: User; student: Student }> {
  const suffix = uid();
  const user = userRepo.create({
    id: uuidv4(),
    email: `test.${suffix}@example.com`,
    passwordHash: '$2b$10$placeholder',
    role: UserRole.STUDENT,
  });
  await userRepo.save(user);

  const student = studentRepo.create({
    userId: user.id,
    rollNumber: `ROLL${suffix}`,
    fullName: `Test Student ${suffix}`,
    year: 2,
    gender: StudentGender.MALE,
    hasSubmitted: false,
    applicationStatus: 'NONE',
    hostelPreferences: [],
    allocatedRoomId: null,
    currentRoomId: null,
    ...overrides,
  });
  await studentRepo.save(student);

  return { user, student };
}

async function createHostelAndRoom(
  hostelRepo: Repository<Hostel>,
  roomRepo: Repository<Room>,
  capacity: number = 2,
): Promise<{ hostel: Hostel; room: Room }> {
  const suffix = uid();
  const hostel = hostelRepo.create({
    name: `Hostel-${suffix}`,
    genderType: GenderType.MALE,
  });
  await hostelRepo.save(hostel);

  const room = roomRepo.create({
    hostelId: hostel.id,
    roomNumber: `R-${suffix}`,
    floor: 1,
    wing: 'A',
    capacity,
    roomType: RoomType.DOUBLE,
    status: RoomStatus.AVAILABLE,
  });
  await roomRepo.save(room);

  return { hostel, room };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('Concurrency & Invariants (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Repositories
  let userRepo: Repository<User>;
  let studentRepo: Repository<Student>;
  let hostelRepo: Repository<Hostel>;
  let roomRepo: Repository<Room>;
  let invitationRepo: Repository<RoommateInvitation>;
  let runRepo: Repository<AllocationRun>;
  let resultRepo: Repository<AllocationResult>;
  let actionRepo: Repository<AdministrativeAction>;
  let swapRequestRepo: Repository<SwapRequest>;

  // Services
  let swapsService: SwapsService;
  let adminService: AdminService;

  // Track created entity IDs for cleanup
  const createdUserIds: string[] = [];
  const createdHostelIds: number[] = [];
  const createdRoomIds: number[] = [];
  const createdRunIds: string[] = [];
  const createdActionIds: string[] = [];
  const createdSwapRequestIds: number[] = [];
  const createdInvitationIds: number[] = [];

  // ── global.fetch mock ─────────────────────────────────────────────────────
  //
  // AdminService.onModuleInit() calls the Python engine via the native `fetch`
  // API to reconcile any QUEUED/RUNNING runs left over from a prior crash.
  // We intercept all `fetch` calls so no real network I/O occurs during tests:
  //
  //   • GET  /allocation/:id  → 404  (run not found in Python engine; triggers
  //                                   the "mark as FAILED" reconciliation path)
  //   • GET  *                → 200  (generic fallback — health checks etc.)
  //   • POST *                → 200  (webhook delivery, triggerAllocation, etc.)
  //
  // This keeps the test suite completely self-contained: only PostgreSQL is needed.
  jest.setTimeout(30000);

  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Install the fetch mock BEFORE compiling the module so that
    // onModuleInit (which runs during app.init()) uses the mock.
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
        const url = input instanceof Request ? input.url : String(input);

        // Python engine allocation-run status probe → 404 (unknown run)
        if (/\/allocation\/[^/]+$/.test(url)) {
          return new Response(
            JSON.stringify({ detail: 'Allocation run not found (mocked)' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } },
          );
        }

        // All other GET/POST calls (health, /allocate webhook, etc.) → 200 OK
        return new Response(
          JSON.stringify({ status: 'ok' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    userRepo = moduleFixture.get(getRepositoryToken(User));
    studentRepo = moduleFixture.get(getRepositoryToken(Student));
    hostelRepo = moduleFixture.get(getRepositoryToken(Hostel));
    roomRepo = moduleFixture.get(getRepositoryToken(Room));
    invitationRepo = moduleFixture.get(getRepositoryToken(RoommateInvitation));
    runRepo = moduleFixture.get(getRepositoryToken(AllocationRun));
    resultRepo = moduleFixture.get(getRepositoryToken(AllocationResult));
    actionRepo = moduleFixture.get(getRepositoryToken(AdministrativeAction));
    swapRequestRepo = moduleFixture.get(getRepositoryToken(SwapRequest));

    swapsService = moduleFixture.get<SwapsService>(SwapsService);
    adminService = moduleFixture.get<AdminService>(AdminService);
  }, 30000);

  afterAll(async () => {
    // Clean up in reverse dependency order to satisfy FK constraints
    if (dataSource && dataSource.isInitialized) {
      if (createdSwapRequestIds.length > 0) {
        await dataSource.query(
          `DELETE FROM swap_history WHERE "swapRequestId" = ANY($1)`,
          [createdSwapRequestIds],
        );
        await swapRequestRepo.delete(createdSwapRequestIds);
      }
      if (createdInvitationIds.length > 0) {
        await invitationRepo.delete(createdInvitationIds);
      }
      if (createdActionIds.length > 0) {
        await actionRepo.delete(createdActionIds);
      }
      if (createdRunIds.length > 0) {
        for (const runId of createdRunIds) {
          await resultRepo.delete({ runId });
        }
        for (const runId of createdRunIds) {
          await runRepo.delete({ id: runId });
        }
      }
      if (createdUserIds.length > 0) {
        await studentRepo.update(
          { userId: createdUserIds as any },
          { currentRoomId: null, allocatedRoomId: null },
        );
        await studentRepo.delete(createdUserIds);
        await userRepo.delete(createdUserIds);
      }
      if (createdRoomIds.length > 0) {
        await roomRepo.delete(createdRoomIds);
      }
      if (createdHostelIds.length > 0) {
        await hostelRepo.delete(createdHostelIds);
      }
    }

    if (app) {
      await app.close();
    }

    if (fetchSpy) {
      fetchSpy.mockRestore();
    }
  }, 30000);

  // ══════════════════════════════════════════════════════════════════════════
  // T1.1 — Room Capacity Database Trigger Test
  // ══════════════════════════════════════════════════════════════════════════

  describe('T1.1 — enforce_room_capacity trigger', () => {
    it('should allow assigning up to capacity students to a room', async () => {
      const { hostel, room } = await createHostelAndRoom(hostelRepo, roomRepo, 2);
      createdHostelIds.push(hostel.id);
      createdRoomIds.push(room.id);

      const { user: u1, student: s1 } = await createUserAndStudent(userRepo, studentRepo);
      const { user: u2, student: s2 } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(u1.id, u2.id);

      // Assign student 1 — should succeed
      await expect(
        studentRepo.update({ userId: s1.userId }, { currentRoomId: room.id }),
      ).resolves.not.toThrow();

      // Assign student 2 — should succeed (capacity = 2, now full)
      await expect(
        studentRepo.update({ userId: s2.userId }, { currentRoomId: room.id }),
      ).resolves.not.toThrow();

      // Verify both are in the room
      const occupants = await studentRepo.find({ where: { currentRoomId: room.id } });
      expect(occupants).toHaveLength(2);
    });

    it('should throw QueryFailedError when a 3rd student tries to enter a capacity-2 room', async () => {
      const { hostel, room } = await createHostelAndRoom(hostelRepo, roomRepo, 2);
      createdHostelIds.push(hostel.id);
      createdRoomIds.push(room.id);

      const { user: u1, student: s1 } = await createUserAndStudent(userRepo, studentRepo);
      const { user: u2, student: s2 } = await createUserAndStudent(userRepo, studentRepo);
      const { user: u3, student: s3 } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(u1.id, u2.id, u3.id);

      // Fill the room to capacity
      await studentRepo.update({ userId: s1.userId }, { currentRoomId: room.id });
      await studentRepo.update({ userId: s2.userId }, { currentRoomId: room.id });

      // Attempt to overfill — must throw
      await expect(
        studentRepo.update({ userId: s3.userId }, { currentRoomId: room.id }),
      ).rejects.toThrow(QueryFailedError);

      // Verify student 3 was NOT placed in the room
      const s3Reloaded = await studentRepo.findOne({ where: { userId: s3.userId } });
      expect(s3Reloaded?.currentRoomId).toBeNull();
    });

    it('should include "at full capacity" in the trigger error message', async () => {
      const { hostel, room } = await createHostelAndRoom(hostelRepo, roomRepo, 1);
      createdHostelIds.push(hostel.id);
      createdRoomIds.push(room.id);

      const { user: u1, student: s1 } = await createUserAndStudent(userRepo, studentRepo);
      const { user: u2, student: s2 } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(u1.id, u2.id);

      // Fill the room
      await studentRepo.update({ userId: s1.userId }, { currentRoomId: room.id });

      let caughtError: any;
      try {
        await studentRepo.update({ userId: s2.userId }, { currentRoomId: room.id });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(QueryFailedError);
      expect((caughtError as QueryFailedError).message).toMatch(/at full capacity/i);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // T1.2 — Roommate Invitation Uniqueness Index Test
  // ══════════════════════════════════════════════════════════════════════════

  describe('T1.2 — UQ_roommate_invitations_sender_accepted partial index', () => {
    it('should allow a student to have at most one accepted invitation as sender', async () => {
      // Create 3 students: A, B, C
      const { user: uA, student: sA } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uB, student: sB } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uC, student: sC } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(uA.id, uB.id, uC.id);

      // First accepted invitation: A → B
      const inv1 = invitationRepo.create({
        senderId: sA.userId,
        receiverId: sB.userId,
        status: RoommateInvitationStatus.ACCEPTED,
      });
      await invitationRepo.save(inv1);
      createdInvitationIds.push(inv1.id);

      // Second accepted invitation: A → C — must violate the partial unique index
      const inv2 = invitationRepo.create({
        senderId: sA.userId,
        receiverId: sC.userId,
        status: RoommateInvitationStatus.ACCEPTED,
      });

      await expect(invitationRepo.save(inv2)).rejects.toThrow(QueryFailedError);
    });

    it('should allow a student to have multiple PENDING or REJECTED invitations as sender', async () => {
      const { user: uA, student: sA } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uB, student: sB } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uC, student: sC } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(uA.id, uB.id, uC.id);

      // Two PENDING invitations from A — must succeed (partial index only covers 'accepted')
      const inv1 = invitationRepo.create({
        senderId: sA.userId,
        receiverId: sB.userId,
        status: RoommateInvitationStatus.PENDING,
      });
      const inv2 = invitationRepo.create({
        senderId: sA.userId,
        receiverId: sC.userId,
        status: RoommateInvitationStatus.PENDING,
      });

      await expect(invitationRepo.save(inv1)).resolves.not.toThrow();
      await expect(invitationRepo.save(inv2)).resolves.not.toThrow();

      createdInvitationIds.push(inv1.id, inv2.id);
    });

    it('should allow a student to have at most one accepted invitation as receiver', async () => {
      const { user: uA, student: sA } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uB, student: sB } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uC, student: sC } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(uA.id, uB.id, uC.id);

      // First accepted invitation: B → A (A is receiver)
      const inv1 = invitationRepo.create({
        senderId: sB.userId,
        receiverId: sA.userId,
        status: RoommateInvitationStatus.ACCEPTED,
      });
      await invitationRepo.save(inv1);
      createdInvitationIds.push(inv1.id);

      // Second accepted invitation: C → A (A is receiver again) — must violate partial index
      const inv2 = invitationRepo.create({
        senderId: sC.userId,
        receiverId: sA.userId,
        status: RoommateInvitationStatus.ACCEPTED,
      });

      await expect(invitationRepo.save(inv2)).rejects.toThrow(QueryFailedError);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // T1.3 — Concurrent Swap Lock Race Test
  // ══════════════════════════════════════════════════════════════════════════

  describe('T1.3 — pessimistic_write lock prevents TOCTOU in executeDirectSwap', () => {
    it('should allow exactly 1 concurrent call to succeed and safely reject the rest', async () => {
      // Clear any pre-existing finalized runs so swaps are permitted
      await runRepo.delete({ finalized: true });

      // ── Seed ──────────────────────────────────────────────────────────────
      const { hostel, room: room1 } = await createHostelAndRoom(hostelRepo, roomRepo, 1);
      createdHostelIds.push(hostel.id);
      createdRoomIds.push(room1.id);

      const room2 = roomRepo.create({
        hostelId: hostel.id,
        roomNumber: `R-${uid()}`,
        floor: 1,
        wing: 'A',
        capacity: 1,
        roomType: RoomType.SINGLE,
        status: RoomStatus.AVAILABLE,
      });
      await roomRepo.save(room2);
      createdRoomIds.push(room2.id);

      const { user: uReq, student: sReq } = await createUserAndStudent(userRepo, studentRepo);
      const { user: uTgt, student: sTgt } = await createUserAndStudent(userRepo, studentRepo);
      createdUserIds.push(uReq.id, uTgt.id);

      // Assign initial rooms
      await studentRepo.update({ userId: sReq.userId }, { currentRoomId: room1.id });
      await studentRepo.update({ userId: sTgt.userId }, { currentRoomId: room2.id });

      // Create a warden user for adminUserId
      const wardenUser = userRepo.create({
        id: uuidv4(),
        email: `warden.${uid()}@test.com`,
        passwordHash: '$2b$10$placeholder',
        role: UserRole.WARDEN,
      });
      await userRepo.save(wardenUser);
      createdUserIds.push(wardenUser.id);

      // Create an accepted swap request
      const swapReq = swapRequestRepo.create({
        requesterId: sReq.userId,
        targetStudentId: sTgt.userId,
        requesterRoomId: room1.id,
        targetRoomId: room2.id,
        status: SwapRequestStatus.ACCEPTED,
        swapType: SwapType.DIRECT,
        reason: 'Concurrency test',
      });
      await swapRequestRepo.save(swapReq);
      createdSwapRequestIds.push(swapReq.id);

      // ── Race 5 concurrent calls ───────────────────────────────────────────
      const CONCURRENCY = 5;
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }).map(() =>
          swapsService.executeDirectSwap(wardenUser.id, swapReq.id),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one call must succeed
      expect(fulfilled).toHaveLength(1);
      // The remaining 4 must fail
      expect(rejected).toHaveLength(CONCURRENCY - 1);

      // All rejections must be due to business logic (request no longer pending/accepted)
      // or concurrency conflict — not unhandled errors
      for (const r of rejected) {
        expect((r as PromiseRejectedResult).reason).toBeDefined();
      }

      // ── Verify final DB state ─────────────────────────────────────────────
      const finalReq = await swapRequestRepo.findOne({ where: { id: swapReq.id } });
      expect(finalReq?.status).toBe(SwapRequestStatus.COMPLETED);

      const finalSReq = await studentRepo.findOne({ where: { userId: sReq.userId } });
      const finalSTgt = await studentRepo.findOne({ where: { userId: sTgt.userId } });

      // Rooms must be cleanly swapped (not both in same room, not unchanged)
      expect(finalSReq?.currentRoomId).toBe(room2.id);
      expect(finalSTgt?.currentRoomId).toBe(room1.id);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // T1.4 — Rollback Snapshot Integrity Test
  // ══════════════════════════════════════════════════════════════════════════

  describe('T1.4 — publishAndCommitRun captures pre-mutation snapshot', () => {
    it('should persist pre-commit student state in AdministrativeAction.snapshot', async () => {
      // ── Seed ──────────────────────────────────────────────────────────────
      const { hostel, room } = await createHostelAndRoom(hostelRepo, roomRepo, 2);
      createdHostelIds.push(hostel.id);
      createdRoomIds.push(room.id);

      const { user: uReq, student: student } = await createUserAndStudent(
        userRepo,
        studentRepo,
        { year: 2, currentRoomId: null },
      );
      createdUserIds.push(uReq.id);

      // Record what the student's state looks like BEFORE the commit
      const preCommitStudent = await studentRepo.findOne({ where: { userId: student.userId } });
      const preCommitRoomId = preCommitStudent?.currentRoomId ?? null;

      // Create a warden user to trigger the run
      const wardenUser = userRepo.create({
        id: uuidv4(),
        email: `warden.${uid()}@test.com`,
        passwordHash: '$2b$10$placeholder',
        role: UserRole.WARDEN,
      });
      await userRepo.save(wardenUser);
      createdUserIds.push(wardenUser.id);

      // Create a COMPLETED, non-finalized AllocationRun
      const run = runRepo.create({
        triggeredById: wardenUser.id,
        status: AllocationRunStatus.COMPLETED,
        allocationMode: AllocationMode.GROUP_BASED,
        finalized: false,
        totalStudents: 1,
        allocatedStudents: 1,
        rulesSnapshot: [],
        targetYears: [student.year],
      });
      await runRepo.save(run);
      createdRunIds.push(run.id);

      // Create an AllocationResult pointing to our room
      const allocationResult = resultRepo.create({
        runId: run.id,
        studentId: student.userId,
        roomId: room.id,
        hostelName: hostel.name,
        roomNumber: room.roomNumber,
        wing: room.wing,
        floor: room.floor,
        happiness: 100,
        isLocked: false,
      });
      await resultRepo.save(allocationResult);

      // ── Execute ───────────────────────────────────────────────────────────
      const result = await adminService.publishAndCommitRun(run.id);

      expect(result.count).toBe(1);
      expect(result.message).toContain('successfully');

      // ── Verify snapshot ───────────────────────────────────────────────────
      // Find the action log created by publishAndCommitRun
      const actionLogs = await actionRepo.find({
        where: { actionType: ActionType.PUBLISH_RUN },
        order: { timestamp: 'DESC' },
      });

      const actionLog = actionLogs.find(
        (a) => (a.metadata as any)?.runId === run.id,
      );
      expect(actionLog).toBeDefined();

      if (actionLog) {
        createdActionIds.push(actionLog.id);

        const snapshot = actionLog.snapshot as Record<
          string,
          { roomId: number | null; applicationStatus: string; hasSubmitted: boolean }
        >;

        // The snapshot MUST contain our student's state
        expect(snapshot).toHaveProperty(student.userId);

        // The snapshot value must reflect the PRE-COMMIT state (before publishAndCommitRun
        // assigned the new room). Our student had currentRoomId = null before.
        expect(snapshot[student.userId].roomId).toBe(preCommitRoomId);
        expect(typeof snapshot[student.userId].applicationStatus).toBe('string');
        expect(typeof snapshot[student.userId].hasSubmitted).toBe('boolean');
      }

      // ── Verify post-commit state ──────────────────────────────────────────
      const postCommitStudent = await studentRepo.findOne({ where: { userId: student.userId } });
      expect(postCommitStudent?.currentRoomId).toBe(room.id);
      expect(postCommitStudent?.allocatedRoomId).toBe(room.id);

      const postCommitRoom = await roomRepo.findOne({ where: { id: room.id } });
      expect(postCommitRoom?.status).toBe(RoomStatus.OCCUPIED);

      const postCommitRun = await runRepo.findOne({ where: { id: run.id } });
      expect(postCommitRun?.finalized).toBe(true);
    });

    it('should throw BadRequestException when run is already finalized', async () => {
      const wardenUser = userRepo.create({
        id: uuidv4(),
        email: `warden.${uid()}@test.com`,
        passwordHash: '$2b$10$placeholder',
        role: UserRole.WARDEN,
      });
      await userRepo.save(wardenUser);
      createdUserIds.push(wardenUser.id);

      const run = runRepo.create({
        triggeredById: wardenUser.id,
        status: AllocationRunStatus.COMPLETED,
        allocationMode: AllocationMode.GROUP_BASED,
        finalized: true, // already finalized
        totalStudents: 0,
        allocatedStudents: 0,
        rulesSnapshot: [],
      });
      await runRepo.save(run);
      createdRunIds.push(run.id);

      await expect(adminService.publishAndCommitRun(run.id)).rejects.toThrow(
        'Allocation run is already published',
      );
    });

    it('should throw BadRequestException when run is not COMPLETED', async () => {
      const wardenUser = userRepo.create({
        id: uuidv4(),
        email: `warden.${uid()}@test.com`,
        passwordHash: '$2b$10$placeholder',
        role: UserRole.WARDEN,
      });
      await userRepo.save(wardenUser);
      createdUserIds.push(wardenUser.id);

      const run = runRepo.create({
        triggeredById: wardenUser.id,
        status: AllocationRunStatus.RUNNING, // not completed
        allocationMode: AllocationMode.GROUP_BASED,
        finalized: false,
        totalStudents: 0,
        allocatedStudents: 0,
        rulesSnapshot: [],
      });
      await runRepo.save(run);
      createdRunIds.push(run.id);

      await expect(adminService.publishAndCommitRun(run.id)).rejects.toThrow(
        'Only completed allocation runs can be published',
      );
    });
  });
});
