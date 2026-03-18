import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRolesTimestamps1773583068812 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add default values to existing timestamp columns if they don't have them
        await queryRunner.query(`
            ALTER TABLE "roles"
            ALTER COLUMN "created_at" SET DEFAULT now(),
            ALTER COLUMN "updated_at" SET DEFAULT now();
        `);
        
        // Update existing null values to current timestamp
        await queryRunner.query(`
            UPDATE "roles"
            SET "created_at" = now() WHERE "created_at" IS NULL;
        `);
        
        await queryRunner.query(`
            UPDATE "roles"
            SET "updated_at" = now() WHERE "updated_at" IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "roles"
            ALTER COLUMN "created_at" DROP DEFAULT,
            ALTER COLUMN "updated_at" DROP DEFAULT;
        `);
    }

}
