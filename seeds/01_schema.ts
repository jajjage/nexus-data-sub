// seeds/01_schema.ts
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
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
     table
       .uuid('role_id')
       .references('id')
       .inTable('roles')
       .onDelete('CASCADE');
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
}
