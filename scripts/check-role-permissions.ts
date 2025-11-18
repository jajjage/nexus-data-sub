import db from '../src/database/connection';

const roleId = process.argv[2];
if (!roleId) {
  console.error('Usage: ts-node scripts/check-role-permissions.ts <roleId>');
  process.exit(1);
}

async function main() {
  try {
    const role = await db('roles').where({ id: roleId }).first();
    console.log('Role row:', role || '(not found)');

    const perms = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permission_id', 'p.id')
      .where('rp.role_id', roleId)
      .select('p.name');

    console.log(
      'Mapped permissions:',
      perms.map(p => p.name)
    );

    const count = await db('role_permissions')
      .where({ role_id: roleId })
      .count<{ count: string }>('permission_id as count');
    console.log(
      'role_permissions count:',
      Array.isArray(count) ? count[0].count : (count as any).count
    );

    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(2);
  }
}

main();
