import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Insert roles
  const roles = await knex('roles')
    .insert([
      { name: 'admin', description: 'System administrator with full access' },
      { name: 'staff', description: 'Election data staff' },
      { name: 'user', description: 'Normal application user' },
    ])
    .returning(['id', 'name']);

  const roleMap: { [key: string]: string } = roles.reduce(
    (acc, role) => ({ ...acc, [role.name]: role.id }),
    {}
  );

  // Insert permissions
  const permissions = await knex('permissions')
    .insert([
      { name: 'reports.create', description: 'Create new election reports' },
      { name: 'reports.read.own', description: 'View own election reports' },
      { name: 'reports.update.own', description: 'Update own election reports' },
      { name: 'reports.delete.own', description: 'Delete own election reports' },
      { name: 'reports.read.all', description: 'View all election reports' },
      { name: 'reports.verify', description: 'Verify election reports' },
      { name: 'incidents.create', description: 'Create new incidents' },
      { name: 'incidents.read', description: 'View incidents' },
      { name: 'incidents.read.all', description: 'View all incidents' },
      { name: 'incidents.read.public', description: 'View public incidents' },
      { name: 'incidents.update.own', description: 'Update own incidents' },
      { name: 'incidents.update.all', description: 'Update all incidents' },
      { name: 'incidents.delete.all', description: 'Delete all incidents' },
      { name: 'users.create', description: 'Create new users' },
      { name: 'users.read.all', description: 'View all users' },
      { name: 'users.update.all', description: 'Update all users' },
      { name: 'users.delete.all', description: 'Delete all users' },
      { name: 'roles.assign', description: 'Assign roles to users' },
      { name: 'profile.read', description: 'View own profile' },
      { name: 'profile.update', description: 'Update own profile' },
      { name: 'system.settings', description: 'Manage system settings' },
    ])
    .returning(['id', 'name']);

  const permMap: { [key: string]: string } = permissions.reduce(
    (acc, perm) => ({ ...acc, [perm.name]: perm.id }),
    {}
  );

  // Insert role_permissions
  const rolePermissions = [
    ...[
      'reports.create',
      'reports.read.own',
      'reports.update.own',
      'reports.delete.own',
      'incidents.read',
      'profile.read',
      'profile.update',
    ].map(perm => ({
      role_id: roleMap['user'],
      permission_id: permMap[perm],
    })),
    ...[
      'reports.read.all',
      'reports.verify',
      'incidents.create',
      'incidents.read.all',
      'incidents.update.own',
      'profile.read',
      'profile.update',
    ].map(perm => ({
      role_id: roleMap['staff'],
      permission_id: permMap[perm],
    })),
    // No separate observer role in the simplified role model.
    ...Object.keys(permMap).map(perm => ({
      role_id: roleMap['admin'],
      permission_id: permMap[perm],
    })),
  ];
  await knex('role_permissions').insert(rolePermissions);
}
