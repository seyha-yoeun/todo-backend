import { MigrationInterface, QueryRunner } from "typeorm";

export class RelateUsersProfilesTodos1792820000000 implements MigrationInterface {
    name = 'RelateUsersProfilesTodos1792820000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "todos" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "todos" ADD CONSTRAINT "FK_todos_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX "idx_todos_user_id" ON "todos" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "idx_todos_user_starred_created_at" ON "todos" ("user_id", "starred", "created_at")`);
        await queryRunner.query(`CREATE INDEX "idx_todos_user_status" ON "todos" ("user_id", "status")`);

        await queryRunner.query(`ALTER TABLE "profiles" ADD "user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "UQ_profiles_user_id" UNIQUE ("user_id")`);
        await queryRunner.query(`ALTER TABLE "profiles" ADD CONSTRAINT "FK_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "FK_profiles_user_id"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP CONSTRAINT "UQ_profiles_user_id"`);
        await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "user_id"`);

        await queryRunner.query(`DROP INDEX "public"."idx_todos_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_todos_user_starred_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_todos_user_id"`);
        await queryRunner.query(`ALTER TABLE "todos" DROP CONSTRAINT "FK_todos_user_id"`);
        await queryRunner.query(`ALTER TABLE "todos" DROP COLUMN "user_id"`);
    }
}
