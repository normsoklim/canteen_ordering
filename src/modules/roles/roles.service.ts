import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import {RolePermission} from './entities/role.permission.entity';
import { Permission } from './entities/permission.entity';
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(RolePermission)
    private rolepermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  create(role: Role): Promise<Role> {
    return this.rolesRepository.save(role);
  }

  findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async remove(id: number): Promise<void> {
    const result = await this.rolesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
  }
  async assignrole(rolepermission:RolePermission):Promise<RolePermission>{
    return this.rolepermissionRepository.save(rolepermission);
  }

  async createpermission(permission:Permission):Promise<Permission>{
    return this.permissionsRepository.save(permission);
  }

  async findAllpermission():Promise<Permission[]>{
    return this.permissionsRepository.find();
  }
   
  
}