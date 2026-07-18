import { MigrationInterface, QueryRunner } from "typeorm";

export class AllocationMetrics1784396043962 implements MigrationInterface {
    name = 'AllocationMetrics1784396043962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_roommate_invitations_sender_accepted"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_roommate_invitations_receiver_accepted"`);
        await queryRunner.query(`ALTER TABLE "groups" ADD "groupPreferences" integer array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "students" ADD "hostelPreferences" integer array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ADD "metrics" jsonb`);
        await queryRunner.query(`ALTER TYPE "public"."allocation_runs_allocationmode_enum" RENAME TO "allocation_runs_allocationmode_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."allocation_runs_allocationmode_enum" AS ENUM('group_based', 'fcfs', 'wing_fcfs', 'global_optimization')`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ALTER COLUMN "allocationMode" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ALTER COLUMN "allocationMode" TYPE "public"."allocation_runs_allocationmode_enum" USING "allocationMode"::"text"::"public"."allocation_runs_allocationmode_enum"`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ALTER COLUMN "allocationMode" SET DEFAULT 'group_based'`);
        await queryRunner.query(`DROP TYPE "public"."allocation_runs_allocationmode_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."allocation_runs_allocationmode_enum_old" AS ENUM('group_based', 'fcfs', 'wing_fcfs', 'satisfaction_optimized')`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ALTER COLUMN "allocationMode" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ALTER COLUMN "allocationMode" TYPE "public"."allocation_runs_allocationmode_enum_old" USING "allocationMode"::"text"::"public"."allocation_runs_allocationmode_enum_old"`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" ALTER COLUMN "allocationMode" SET DEFAULT 'group_based'`);
        await queryRunner.query(`DROP TYPE "public"."allocation_runs_allocationmode_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."allocation_runs_allocationmode_enum_old" RENAME TO "allocation_runs_allocationmode_enum"`);
        await queryRunner.query(`ALTER TABLE "allocation_runs" DROP COLUMN "metrics"`);
        await queryRunner.query(`ALTER TABLE "students" DROP COLUMN "hostelPreferences"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "groupPreferences"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roommate_invitations_receiver_accepted" ON "roommate_invitations" ("receiverId") WHERE (status = 'accepted'::roommate_invitations_status_enum)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roommate_invitations_sender_accepted" ON "roommate_invitations" ("senderId") WHERE (status = 'accepted'::roommate_invitations_status_enum)`);
    }

}
