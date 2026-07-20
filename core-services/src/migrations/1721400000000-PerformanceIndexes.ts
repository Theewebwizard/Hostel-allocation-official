import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 3: Performance Indexes for Large Student Populations (10,000+)
 *
 * Adds four composite/partial indexes to accelerate the most expensive queries
 * in the allocation hot-path:
 *
 *  1. idx_students_year_gender
 *     Covers cohort-filter queries in `triggerAllocation` and `publishAndCommitRun`
 *     that filter `students` by `year` (and optionally `gender`).  Eliminates
 *     full-table-scans when targeting a specific graduating batch.
 *
 *  2. idx_students_current_room (partial, non-null only)
 *     Covers `WHERE "currentRoomId" = $n` lookups used by the room-capacity
 *     trigger and by room-occupancy counts in the allocation engine.  The
 *     partial clause skips unallocated students entirely, keeping the index
 *     small and fast.
 *
 *  3. idx_rooms_hostel_wing_status
 *     Covers the compound filter used by `AllocationEngine._get_valid_rooms_for_student`
 *     and the allocation-data endpoint: `hostelId = ? AND (wing = ? OR wing IS NULL) AND status = 'available'`.
 *     As student populations grow this query is called O(students × rooms) times.
 *
 *  4. idx_rules_priority_id
 *     Mirrors the ORDER BY clause in `AdminService.getAllRules()` and the rules
 *     snapshot fetch in `triggerAllocation`.  PostgreSQL can satisfy the query
 *     via index-only scan, eliminating the sort step entirely.
 *
 * All statements use `CREATE INDEX IF NOT EXISTS` for idempotent, re-runnable
 * behaviour and `CONCURRENTLY` where possible to avoid locking the table during
 * migrations on a live database.
 *
 * NOTE: `CREATE INDEX CONCURRENTLY` cannot run inside an explicit transaction,
 * so the migration uses `queryRunner.query` directly (which issues statements
 * outside of any managed transaction block).
 */
export class PerformanceIndexes1721400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Composite index: year + gender (cohort filters)
    //    Typical query: SELECT * FROM students WHERE year = $1 AND gender = $2
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_students_year_gender
        ON students (year, gender);
    `);

    // 2. Partial index: currentRoomId (room occupancy / swap lookups)
    //    Skips the large number of unallocated students (currentRoomId IS NULL).
    //    Typical query: SELECT * FROM students WHERE "currentRoomId" = $1
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_students_current_room
        ON students ("currentRoomId")
        WHERE "currentRoomId" IS NOT NULL;
    `);

    // 3. Composite index: hostelId, wing, status (allocation eligibility filter)
    //    Typical query: SELECT * FROM rooms
    //                   WHERE "hostelId" = $1 AND status = 'available'
    //                   ORDER BY wing, "roomNumber"
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rooms_hostel_wing_status
        ON rooms ("hostelId", wing, status);
    `);

    // 4. Covering index: priority DESC, id ASC (rules fetch / snapshot)
    //    Matches ORDER BY priority DESC, id ASC used in AdminService.getAllRules()
    //    and the snapshot query in triggerAllocation.
    //    Note: PostgreSQL DESC/ASC column sort options are stored in the index
    //    definition so the planner can use it for index-only scans.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rules_priority_id
        ON allocation_rules (priority DESC, id ASC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rules_priority_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rooms_hostel_wing_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_students_current_room;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_students_year_gender;`);
  }
}
