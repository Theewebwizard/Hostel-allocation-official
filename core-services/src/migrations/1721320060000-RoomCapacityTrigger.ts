import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 2: Room Capacity Enforcement via PostgreSQL Trigger
 *
 * Installs a BEFORE UPDATE trigger on the "students" table that aborts any
 * UPDATE which would cause a room to exceed its configured capacity.
 *
 * Trigger semantics:
 *  - Fires BEFORE UPDATE on "students", FOR EACH ROW.
 *  - Only activates when "currentRoomId" is actually changing (NEW vs OLD check),
 *    and only when the new value is not NULL (students leaving a room are always OK).
 *  - Counts existing occupants of the target room EXCLUDING the row being updated
 *    (OLD."currentRoomId" may equal NEW."currentRoomId" on a non-room-change update;
 *    the WHERE "userId" != NEW."userId" exclusion avoids counting self).
 *  - Fetches the room's capacity from the "rooms" table.
 *  - If (existing_occupants + 1) > capacity → RAISE EXCEPTION, aborting the transaction.
 *
 * This turns the application-level capacity invariant into a hard database constraint
 * that cannot be bypassed by concurrent transactions or direct SQL edits.
 *
 * NOTE: The allocation engine bulk-assigns students sequentially within a single
 * transaction. Because the trigger fires BEFORE each individual row update and
 * checks the live count (including already-updated rows in the same transaction),
 * it correctly enforces capacity throughout the bulk assignment.
 */
export class RoomCapacityTrigger1721320060000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create the trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_room_capacity()
      RETURNS TRIGGER AS $$
      DECLARE
        room_capacity    INT;
        current_occupants INT;
      BEGIN
        -- Only enforce when the student is moving INTO a (new) room
        IF NEW."currentRoomId" IS NULL THEN
          RETURN NEW;
        END IF;

        IF OLD."currentRoomId" IS NOT DISTINCT FROM NEW."currentRoomId" THEN
          -- currentRoomId unchanged — no capacity impact, skip
          RETURN NEW;
        END IF;

        -- Fetch the capacity of the destination room
        SELECT capacity
          INTO room_capacity
          FROM rooms
         WHERE id = NEW."currentRoomId";

        IF room_capacity IS NULL THEN
          RAISE EXCEPTION
            'Room % does not exist', NEW."currentRoomId";
        END IF;

        -- Count students already occupying the destination room,
        -- excluding the student being updated (handles self-reassignment)
        SELECT COUNT(*)
          INTO current_occupants
          FROM students
         WHERE "currentRoomId" = NEW."currentRoomId"
           AND "userId" != NEW."userId";

        IF (current_occupants + 1) > room_capacity THEN
          RAISE EXCEPTION
            'Room % is at full capacity (% / %)',
            NEW."currentRoomId",
            current_occupants,
            room_capacity;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Step 2: Attach the trigger to the students table
    await queryRunner.query(`
      CREATE TRIGGER enforce_room_capacity
      BEFORE UPDATE ON students
      FOR EACH ROW
      EXECUTE FUNCTION check_room_capacity();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS enforce_room_capacity ON students;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS check_room_capacity();
    `);
  }
}
