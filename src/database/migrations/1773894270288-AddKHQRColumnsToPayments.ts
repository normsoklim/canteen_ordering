import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKHQRColumnsToPayments1773894270288 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add transaction_id column
        await queryRunner.query(`
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255) NULL
        `);
        
        // Add khqr_string column
        await queryRunner.query(`
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS khqr_string TEXT NULL
        `);
        
        // Add qr_image column
        await queryRunner.query(`
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS qr_image TEXT NULL
        `);
        
        // Add expires_at column
        await queryRunner.query(`
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL
        `);
        
        // Add created_at column
        await queryRunner.query(`
            ALTER TABLE payments
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove all added columns
        await queryRunner.query(`
            ALTER TABLE payments 
            DROP COLUMN IF EXISTS transaction_id
        `);
        
        await queryRunner.query(`
            ALTER TABLE payments 
            DROP COLUMN IF EXISTS khqr_string
        `);
        
        await queryRunner.query(`
            ALTER TABLE payments 
            DROP COLUMN IF EXISTS qr_image
        `);
        
        await queryRunner.query(`
            ALTER TABLE payments 
            DROP COLUMN IF EXISTS expires_at
        `);
        
        await queryRunner.query(`
            ALTER TABLE payments 
            DROP COLUMN IF EXISTS paid_at
        `);
    }
}
