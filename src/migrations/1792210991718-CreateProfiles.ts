import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfiles1792210991718 implements MigrationInterface {
    name = 'CreateProfiles1792210991718'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."profiles_avatarcolor_enum" AS ENUM(
                'indigo',
                'sky',
                'teal',
                'emerald',
                'amber',
                'rose',
                'violet'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "profiles" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying(40) NOT NULL DEFAULT 'Guest',
                "email" character varying(254) NOT NULL DEFAULT '',
                "avatarColor" "public"."profiles_avatarcolor_enum" NOT NULL DEFAULT 'indigo',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "profiles"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."profiles_avatarcolor_enum"
        `);
    }

}
