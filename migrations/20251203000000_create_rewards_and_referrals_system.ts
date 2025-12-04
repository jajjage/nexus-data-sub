import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // =========================================
  // Create Rewards Table
  // =========================================
  await knex.schema.createTable('rewards', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.integer('points').notNullable().defaultTo(0);
    table.string('reason', 255).notNullable(); // e.g., 'referral_sign_up', 'purchase_completion'
    table.timestamp('earned_at').notNullable().defaultTo(knex.fn.now());
    table
      .enum('status', ['pending', 'credited', 'expired', 'revoked'])
      .notNullable()
      .defaultTo('pending');
    table.timestamp('expires_at').nullable(); // Optional expiration date
    table.text('metadata').nullable(); // JSON metadata for additional context
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['user_id']);
    table.index(['status']);
    table.index(['earned_at']);
    table.index(['user_id', 'status']);
  });

  // =========================================
  // Create Referrals Table
  // =========================================
  await knex.schema.createTable('referrals', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('referrer_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('referred_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.decimal('reward_amount', 10, 2).notNullable().defaultTo(0);
    table
      .enum('status', ['pending', 'active', 'completed', 'cancelled'])
      .notNullable()
      .defaultTo('pending');
    table
      .uuid('reward_id')
      .nullable()
      .references('id')
      .inTable('rewards')
      .onDelete('SET NULL');
    table.string('referral_code', 50).nullable(); // Unique referral code
    table.timestamp('referral_code_generated_at').nullable();
    table.timestamp('referral_completed_at').nullable(); // When referred user completes required action
    table.text('metadata').nullable(); // JSON metadata for conditions met, etc.
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['referrer_user_id']);
    table.index(['referred_user_id']);
    table.index(['status']);
    table.index(['referral_code']);
    table.unique(['referred_user_id']); // One referral per referred user
    table.index(['referrer_user_id', 'status']);
  });

  // =========================================
  // Create Badges Table
  // =========================================
  await knex.schema.createTable('badges', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.string('icon', 255).nullable(); // URL to badge icon
    table.string('required_action', 100).nullable(); // e.g., 'first_referral', 'top_referee'
    table.integer('required_value').nullable(); // e.g., 1 for first_referral, 5 for top_referee
    table
      .enum('category', ['achievement', 'milestone', 'special'])
      .notNullable()
      .defaultTo('achievement');
    table.boolean('is_active').defaultTo(true);
    table.text('metadata').nullable(); // JSON metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index(['required_action']);
    table.index(['is_active']);
  });

  // =========================================
  // Create User Badges Junction Table
  // =========================================
  await knex.schema.createTable('user_badges', table => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .uuid('badge_id')
      .notNullable()
      .references('id')
      .inTable('badges')
      .onDelete('CASCADE');
    table.timestamp('earned_at').notNullable().defaultTo(knex.fn.now());
    table.text('metadata').nullable(); // JSON metadata (e.g., context of earning)
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Composite primary key: one badge per user
    table.primary(['user_id', 'badge_id']);

    // Indexes
    table.index(['user_id']);
    table.index(['badge_id']);
    table.index(['earned_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_badges');
  await knex.schema.dropTableIfExists('badges');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('rewards');
}
