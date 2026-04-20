import { Column, PrimaryGeneratedColumn } from "typeorm";

export class CreateReportDto {
    @PrimaryGeneratedColumn({name:'report_id'})
    id: number

    @Column()
    reportType: string

    @Column()
    generatedBy: number

    @Column()
    period_start:Date

    @Column()
    period_end:Date

}