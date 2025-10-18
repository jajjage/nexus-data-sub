import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('role_permissions').del();
  await knex('permissions').del();
  await knex('roles').del();

  // Insert roles
  await knex('roles').insert([
    { name: 'admin', description: 'System administrator with full access' },
    { name: 'staff', description: 'Nexus Data staff' },
    { name: 'user', description: 'Normal application user' },
  ]);

  // Insert all permissions
  const permissions = [
    { name: 'incidents.create', description: 'Create new incidents' },
    { name: 'reports.create', description: 'Create new reports' },
    { name: 'reports.read.own', description: 'View own reports' },
    { name: 'reports.read.all', description: 'View all reports' },
    { name: 'reports.update.all', description: 'Update all reports' },
    { name: 'reports.delete.all', description: 'Delete all reports' },
    { name: 'reports.verify', description: 'Verify election reports' },
    { name: 'transactions.read.own', description: 'View own transactions' },
    { name: 'transactions.read.all', description: 'View all transactions' },
    { name: 'transactions.create', description: 'Create new transactions' },
    { name: 'transactions.update', description: 'Update transactions' },
    { name: 'transactions.delete', description: 'Delete transactions' },
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
    { name: 'topup-requests.read.all', description: 'View all topup requests' },
    { name: 'topup-requests.update', description: 'Update topup requests' },
    { name: 'settlements.read.all', description: 'View all settlements' },
    { name: 'settlements.create', description: 'Create new settlements' },
    { name: 'operators.read.all', description: 'View all operators' },
    { name: 'operators.create', description: 'Create new operators' },
    { name: 'operators.update', description: 'Update operators' },
    { name: 'suppliers.read.all', description: 'View all suppliers' },
    { name: 'suppliers.create', description: 'Create new suppliers' },
    { name: 'suppliers.update', description: 'Update suppliers' },
    { name: 'products.read.all', description: 'View all products' },
    { name: 'products.create', description: 'Create new products' },
    { name: 'products.update', description: 'Update products' },
  ];
  await knex('permissions').insert(permissions);

  // Define role-permission mappings
  const rolePermissions = {
    user: [
      'reports.create',
      'reports.read.own',
      'reports.update.own',
      'reports.delete.own',
      'transactions.read.own',
      'transactions.create',
      'incidents.read',
      'profile.read',
      'profile.update',
    ],
    staff: [
      'reports.read.all',
      'reports.update.all',
      'reports.delete.all',
      'reports.verify',
      'transactions.read.all',
      'transactions.create',
      'transactions.update',
      'transactions.delete',
      'incidents.create',
      'incidents.read.all',
      'incidents.update.own',
      'profile.read',
      'profile.update',
      'topup-requests.read.all',
      'settlements.read.all',
    ],
    admin: [
      'reports.create',
      'reports.read.all',
      'reports.update.all',
      'reports.delete.all',
      'reports.verify',
      'transactions.read.all',
      'transactions.create',
      'transactions.update',
      'transactions.delete',
      'incidents.create',
      'incidents.read.all',
      'incidents.update.all',
      'incidents.delete.all',
      'users.create',
      'users.read.all',
      'users.update.all',
      'users.delete.all',
      'roles.assign',
      'profile.read',
      'profile.update',
      'system.settings',
      'topup-requests.read.all',
      'topup-requests.update',
      'settlements.read.all',
      'settlements.create',
      'operators.read.all',
      'operators.create',
      'operators.update',
      'suppliers.read.all',
      'suppliers.create',
      'suppliers.update',
      'products.read.all',
      'products.create',
      'products.update',
    ],
  };

  // Insert role-permission mappings
  for (const roleName of Object.keys(rolePermissions)) {
    const role = await knex('roles').where('name', roleName).first();
    if (role) {
      const permsToInsert = await knex('permissions')
        .whereIn(
          'name',
          rolePermissions[roleName as keyof typeof rolePermissions]
        )
        .select('id');

      const rolePerms = permsToInsert.map(perm => ({
        role_id: role.id,
        permission_id: perm.id,
      }));

      if (rolePerms.length > 0) {
        await knex('role_permissions').insert(rolePerms);
      }
    }
  }
}
