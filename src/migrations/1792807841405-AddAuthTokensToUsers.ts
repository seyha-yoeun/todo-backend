import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthTokensToUsers1792807841405 implements MigrationInterface {
    name = 'AddAuthTokensToUsers1792807841405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "access_token_hash" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refresh_token_hash" character varying(64)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token_hash"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "access_token_hash"`);
    }

}
