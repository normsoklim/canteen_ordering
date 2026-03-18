import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('role_permissions')
export class RolePermission {
    @PrimaryGeneratedColumn({name:'role_permission_id'})
    id: number

    @Column()
    role_id: number

    @Column()
    permission_id: number

    @Column({default:true})
    is_allowed:boolean;

    @Column({type:'timestamp', default: () => 'CURRENT_TIMESTAMP'})
    granted_at:Date
}