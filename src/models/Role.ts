import db from '../database/connection';

export interface Role {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;

  createdAt: Date;
}

export class RoleModel {
  static async findByName(name: string): Promise<Role | null> {
    return db('roles').where({ name }).first();
  }

  static async findById(id: string): Promise<Role | null> {
    return db('roles').where({ id }).first();
  }

  static async getAll(): Promise<Role[]> {
    return db('roles').orderBy('name');
  }

  static async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    return db('permissions as p')
      .join('role_permissions as rp', 'p.id', 'rp.permission_id')
      .where('rp.role_id', roleId)
      .select('p.*');
  }

  static async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({ role_id: roleId, updated_at: db.fn.now() });
  }
}
