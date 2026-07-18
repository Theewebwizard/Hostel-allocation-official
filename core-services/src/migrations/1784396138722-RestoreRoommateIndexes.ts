import { MigrationInterface, QueryRunner } from "typeorm";

export class RestoreRoommateIndexes1784396138722 implements MigrationInterface {
    name = 'RestoreRoommateIndexes1784396138722'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roommate_invitations_receiver_accepted" ON "roommate_invitations" ("receiverId") WHERE status = 'accepted'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_roommate_invitations_sender_accepted" ON "roommate_invitations" ("senderId") WHERE status = 'accepted'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_roommate_invitations_sender_accepted"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_roommate_invitations_receiver_accepted"`);
    }

}
