// migrations/1600000000000_initial_schema.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 50).unique().notNullable();
    table.text('description');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('permissions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).unique().notNullable();
    table.text('description');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('role_permissions', table => {
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table
      .uuid('permission_id')
      .references('id')
      .inTable('permissions')
      .onDelete('CASCADE');
    table.primary(['role_id', 'permission_id']);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('users', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('full_name', 255).nullable();
    // Store phone numbers as strings to preserve formatting and avoid integer overflow
    table.string('phone_number', 20).unique().nullable();
    table.string('pin', 5).nullable();
    table.string('email', 255).unique().notNullable();
    table.string('password', 255).notNullable();
    table.string('role', 255);
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.boolean('is_verified').defaultTo(true);
    table.string('two_factor_secret', 255).nullable();
    table.boolean('two_factor_enabled').defaultTo(false);
    table.string('password_reset_token', 255);
    table.timestamp('password_reset_token_expires_at');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('backup_code', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.text('two_factor_backup_codes').nullable();
    table.timestamps(true, true);
  });

  // Insert roles
  await knex.raw(`
    INSERT INTO roles (name, description) VALUES
    ('admin', 'System administrator with full access'),
    ('staff', 'Nexus Data staff'),
    ('user', 'Normal application user')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Insert all permissions
  await knex.raw(`
    INSERT INTO permissions (name, description) VALUES
    ('incidents.create', 'Create new incidents'),
    ('reports.create', 'Create new reports'),
    ('reports.read.own', 'View own reports'),
    ('reports.read.all', 'View all reports'),
    ('reports.update.all', 'Update all reports'),
    ('reports.delete.all', 'Delete all reports'),
    ('reports.verify', 'Verify election reports'),
    ('transactions.read.own', 'View own transactions'),
    ('transactions.read.all', 'View all transactions'),
    ('transactions.create', 'Create new transactions'),
    ('transactions.update', 'Update transactions'),
    ('transactions.delete', 'Delete transactions'),
    ('incidents.read', 'View incidents'),
    ('incidents.read.all', 'View all incidents'),
    ('incidents.read.public', 'View public incidents'),
    ('incidents.update.own', 'Update own incidents'),
    ('incidents.update.all', 'Update all incidents'),
    ('incidents.delete.all', 'Delete all incidents'),
    ('users.create', 'Create new users'),
    ('users.read.all', 'View all users'),
    ('users.update.all', 'Update all users'),
    ('users.delete.all', 'Delete all users'),
    ('roles.assign', 'Assign roles to users'),
    ('profile.read', 'View own profile'),
    ('profile.update', 'Update own profile'),
    ('system.settings', 'Manage system settings')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Insert user permissions
  await knex.raw(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'user' AND p.name IN (
      'reports.create',
      'reports.read.own',
      'reports.update.own',
      'reports.delete.own',
      'transactions.read.own',
      'transactions.create',
      'incidents.read',
      'profile.read',
      'profile.update'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
  // staff permissions
  await knex.raw(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'staff' AND p.name IN (
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
      'profile.update'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);

  // Admin permissions (all of them)
  await knex.raw(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'admin' AND p.name IN (
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
      'system.settings'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('backup_code');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
}
