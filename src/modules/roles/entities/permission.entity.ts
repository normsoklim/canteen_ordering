
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('permissions')
export class Permission {
    @PrimaryGeneratedColumn({name:'permission_id'})
    id: number

    @Column()
    module:string;

    @Column()
    action:string;

    @Column()
    description:string
}