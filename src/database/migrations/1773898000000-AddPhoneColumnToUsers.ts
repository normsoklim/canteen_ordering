import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneColumnToUsers1773898000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const phoneColumn = table?.findColumnByName('phone');
    if (!phoneColumn) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'phone',
        type: 'varchar',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const phoneColumn = table?.findColumnByName('phone');
    if (phoneColumn) {
      await queryRunner.dropColumn('users', 'phone');
    }
  }
}
