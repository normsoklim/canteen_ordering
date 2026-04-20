import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateReportTables1773896000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reports table
    await queryRunner.createTable(new Table({
      name: 'reports',
      columns: [
        {
          name: 'report_id',
          type: 'serial',
          isPrimary: true,
        },
        {
          name: 'generated_by',
          type: 'int',
          isNullable: false,
        },
        {
          name: 'report_type',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'period_start',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'period_end',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'total_revenue',
          type: 'decimal',
          precision: 10,
          scale: 2,
          default: 0,
        },
        {
          name: 'total_orders',
          type: 'int',
          default: 0,
        },
        {
          name: 'paid_transactions',
          type: 'int',
          default: 0,
        },
        {
          name: 'export_format',
          type: 'enum',
          enum: ['PDF', 'EXCEL', 'CSV'],
          isNullable: false,
        },
        {
          name: 'file_url',
          type: 'varchar',
          length: '500',
          isNullable: true,
        },
        {
          name: 'generated_at',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        },
        {
          name: 'status',
          type: 'enum',
          enum: ['processing', 'completed', 'failed'],
          default: '\'processing\'',
        },
        {
          name: 'estimated_completion_time',
          type: 'timestamp',
          isNullable: true,
        },
      ],
    }));

    // Create report_line_items table
    await queryRunner.createTable(new Table({
      name: 'report_line_items',
      columns: [
        {
          name: 'line_item_id',
          type: 'serial',
          isPrimary: true,
        },
        {
          name: 'report_id',
          type: 'int',
          isNullable: false,
        },
        {
          name: 'menu_id',
          type: 'int',
          isNullable: false,
        },
        {
          name: 'item_name',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'total_quantity_sold',
          type: 'int',
          default: 0,
        },
        {
          name: 'total_revenue',
          type: 'decimal',
          precision: 10,
          scale: 2,
          default: 0,
        },
        {
          name: 'order_count',
          type: 'int',
          default: 0,
        },
        {
          name: 'rank',
          type: 'int',
          default: 0,
        },
      ],
    }));

    // Add foreign key constraints
    await queryRunner.createForeignKey('reports', new TableForeignKey({
      columnNames: ['generated_by'],
      referencedColumnNames: ['id'],
      referencedTableName: 'users',
      onDelete: 'CASCADE',
    }));

    await queryRunner.createForeignKey('report_line_items', new TableForeignKey({
      columnNames: ['report_id'],
      referencedColumnNames: ['report_id'],
      referencedTableName: 'reports',
      onDelete: 'CASCADE',
    }));

    await queryRunner.createForeignKey('report_line_items', new TableForeignKey({
      columnNames: ['menu_id'],
      referencedColumnNames: ['menu_id'],
      referencedTableName: 'menu_items',
      onDelete: 'CASCADE',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const reportLineItemsTable = await queryRunner.getTable('report_line_items');
    const reportTable = await queryRunner.getTable('reports');
    
    if (reportLineItemsTable) {
      const foreignKeys = reportLineItemsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('report_line_items', foreignKey);
      }
    }

    if (reportTable) {
      const foreignKeys = reportTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('reports', foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('report_line_items');
    await queryRunner.dropTable('reports');
  }
}