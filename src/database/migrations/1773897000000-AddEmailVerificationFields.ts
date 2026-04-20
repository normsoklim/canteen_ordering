import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerificationFields1773897000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'isEmailVerified',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'emailVerificationToken',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'emailVerifiedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'emailVerifiedAt');
    await queryRunner.dropColumn('users', 'emailVerificationToken');
    await queryRunner.dropColumn('users', 'isEmailVerified');
  }
}