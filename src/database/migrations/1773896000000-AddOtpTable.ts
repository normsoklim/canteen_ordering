import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddOtpTable1773896000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'otps',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'otpCode',
            type: 'varchar',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'otps',
      new TableIndex({
        name: 'IDX_OTP_EMAIL',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('otps', 'IDX_OTP_EMAIL');
    await queryRunner.dropTable('otps');
  }
}