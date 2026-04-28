import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateOrderTrackingTable1773899000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type for order status if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."order_tracking_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.createTable(
      new Table({
        name: 'order_tracking',
        columns: [
          {
            name: 'tracking_id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'order_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
            isNullable: false,
          },
          {
            name: 'previous_status',
            type: 'enum',
            enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
            isNullable: true,
          },
          {
            name: 'estimated_ready_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key for order_id -> orders(order_id)
    await queryRunner.createForeignKey(
      'order_tracking',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedColumnNames: ['order_id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for updated_by -> users(id)
    await queryRunner.createForeignKey(
      'order_tracking',
      new TableForeignKey({
        columnNames: ['updated_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('order_tracking');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('order_tracking', foreignKey);
      }
    }

    await queryRunner.dropTable('order_tracking');

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_tracking_status_enum"`);
  }
}
