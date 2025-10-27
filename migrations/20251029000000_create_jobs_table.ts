import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('jobs', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('type').notNullable();
    t.jsonb('payload').notNullable().defaultTo('{}');
    t.text('status').notNullable().defaultTo('pending'); // pending, running, completed, failed
    t.integer('attempts').notNullable().defaultTo(0);
    t.jsonb('result');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE INDEX idx_jobs_status ON jobs(status);');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('jobs');
}
