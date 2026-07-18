import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 1: Roommate Uniqueness Invariant
 *
 * Enforces at the schema level that a student (as either sender OR receiver)
 * can only appear in at most ONE accepted roommate invitation row.
 *
 * Two partial unique indexes are created — one per role — so that:
 *   - INSERT/UPDATE that would create a second ACCEPTED row for the same
 *     senderId is rejected by PostgreSQL with a unique-violation error.
 *   - Rows with status != 'accepted' (PENDING, REJECTED, CANCELLED) are
 *     excluded from the index via the WHERE clause, so they are unrestricted.
 *
 * This replaces the application-level check in RoommateInvitationsService
 * with a schema-level guarantee that is race-condition-safe.
 */
export class RoommateUniquenessIndex1721320000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: a student may only be SENDER in one ACCEPTED invitation
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_roommate_invitations_sender_accepted"
      ON "roommate_invitations" ("senderId")
      WHERE "status" = 'accepted'
    `);

    // Guard: a student may only be RECEIVER in one ACCEPTED invitation
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "UQ_roommate_invitations_receiver_accepted"
      ON "roommate_invitations" ("receiverId")
      WHERE "status" = 'accepted'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_roommate_invitations_sender_accepted"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_roommate_invitations_receiver_accepted"
    `);
  }
}
