import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolePermission } from './entities/role.permission.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permission } from './entities/permission.entity';

@Controller('roles')
@Roles('admin')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  
  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    const role = new Role();
    role.name = createRoleDto.name;
    role.description = createRoleDto.description;
    return this.rolesService.create(role);
  }
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }
  
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }
  
  @Post('assignrole')
  assignrole(@Body() rolepermission:RolePermission) {
    const role = new RolePermission();
    role.role_id = rolepermission.role_id;
    role.permission_id = rolepermission.permission_id;
    role.is_allowed = rolepermission.is_allowed;
    return this.rolesService.assignrole(role);
  }
  
  @Get('permission')
  findAllpermission() {
    return this.rolesService.findAllpermission();
  }
  @Post('permission')
  createpermission(@Body() permission:Permission) {
    const role = new Permission();
    role.module = permission.module;
    role.action = permission.action;
    role.description = permission.description;
    return this.rolesService.createpermission(role);
  }
}