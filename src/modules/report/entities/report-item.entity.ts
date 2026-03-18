import { MenuItem } from "src/modules/menu/entities/menu-item.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('report_line_items')
export class ReportItem {
    @PrimaryGeneratedColumn({name:'line_item_id'})
    id: number;

    @Column()
    report_id:number;

    @Column()
    menu_id:number;

    @Column()
    item_name:string;

    @Column()
    totalQuantitySold:number;

    @Column()
    totalRevenue:number;

    @Column()
    orderCount:number;

    @Column()
    rank:number;

    @ManyToOne(() => Report)
    @JoinColumn({ name: 'report_id' })
    report: Report

    @ManyToOne(() => MenuItem)
    @JoinColumn({ name: 'menu_id' })
    menuItem: MenuItem

}