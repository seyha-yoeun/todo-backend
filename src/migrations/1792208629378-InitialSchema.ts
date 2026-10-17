import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792208629378 implements MigrationInterface {
  name = 'InitialSchema1792208629378';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."todos_status_enum" AS ENUM('To Do', 'In Progress', 'Done')
        `);
    await queryRunner.query(`
            CREATE TABLE "todos" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying(120) NOT NULL,
                "status" "public"."todos_status_enum" NOT NULL DEFAULT 'To Do',
                "starred" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ca8cafd59ca6faaf67995344225" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_todos_status" ON "todos" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_todos_starred_created_at" ON "todos" ("starred", "created_at")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."idx_todos_starred_created_at"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_todos_status"
        `);
    await queryRunner.query(`
            DROP TABLE "todos"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."todos_status_enum"
        `);
  }
}
