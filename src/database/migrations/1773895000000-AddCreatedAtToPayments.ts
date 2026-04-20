import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToPayments1773895000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add created_at column
        await queryRunner.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove created_at column
        await queryRunner.query(`
            ALTER TABLE payments 
            DROP COLUMN IF EXISTS created_at
        `);
    }
}