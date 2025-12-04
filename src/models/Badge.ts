import { Knex } from 'knex';
import db from '../database/connection';

// =================================================================
// Interfaces
// =================================================================

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  requiredAction: string | null;
  requiredValue: number | null;
  category: 'achievement' | 'milestone' | 'special';
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBadge {
  userId: string;
  badgeId: string;
  earnedAt: Date;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateBadgeInput {
  name: string;
  description?: string;
  icon?: string;
  requiredAction?: string;
  requiredValue?: number;
  category?: 'achievement' | 'milestone' | 'special';
  metadata?: Record<string, any>;
}

// =================================================================
// Badge Model Class
// =================================================================

export class BadgeModel {
  private static readonly TABLE_NAME = 'badges';

  /**
   * Creates a new badge
   * @param data - Badge data
   * @param trx - Optional transaction
   * @returns The created badge
   */
  static async create(
    data: CreateBadgeInput,
    trx?: Knex.Transaction
  ): Promise<Badge> {
    const connection = trx || db;
    const [badge] = await connection(this.TABLE_NAME)
      .insert({
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        required_action: data.requiredAction || null,
        required_value: data.requiredValue || null,
        category: data.category || 'achievement',
        is_active: true,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      })
      .returning('*');

    return this.formatRecord(badge);
  }

  /**
   * Finds a badge by ID
   * @param id - The badge ID
   * @returns The badge or null
   */
  static async findById(id: string): Promise<Badge | null> {
    const badge = await db(this.TABLE_NAME).where({ id }).first();
    return badge ? this.formatRecord(badge) : null;
  }

  /**
   * Finds a badge by name
   * @param name - The badge name
   * @returns The badge or null
   */
  static async findByName(name: string): Promise<Badge | null> {
    const badge = await db(this.TABLE_NAME).where({ name }).first();
    return badge ? this.formatRecord(badge) : null;
  }

  /**
   * Gets all active badges
   * @returns Array of active badges
   */
  static async findAllActive(): Promise<Badge[]> {
    const badges = await db(this.TABLE_NAME)
      .where({ is_active: true })
      .orderBy('name');
    return badges.map(b => this.formatRecord(b));
  }

  /**
   * Gets badges by category
   * @param category - The badge category
   * @returns Array of badges
   */
  static async findByCategory(
    category: 'achievement' | 'milestone' | 'special'
  ): Promise<Badge[]> {
    const badges = await db(this.TABLE_NAME)
      .where({ category, is_active: true })
      .orderBy('name');
    return badges.map(b => this.formatRecord(b));
  }

  /**
   * Gets badges by required action
   * @param action - The required action
   * @returns Array of badges
   */
  static async findByRequiredAction(action: string): Promise<Badge[]> {
    const badges = await db(this.TABLE_NAME)
      .where({ required_action: action, is_active: true })
      .orderBy('name');
    return badges.map(b => this.formatRecord(b));
  }

  /**
   * Updates a badge
   * @param id - The badge ID
   * @param data - Update data
   * @param trx - Optional transaction
   * @returns The updated badge or null
   */
  static async update(
    id: string,
    data: Partial<CreateBadgeInput>,
    trx?: Knex.Transaction
  ): Promise<Badge | null> {
    const connection = trx || db;
    const updateData: Record<string, any> = {};

    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.icon) updateData.icon = data.icon;
    if (data.requiredAction) updateData.required_action = data.requiredAction;
    if (data.requiredValue) updateData.required_value = data.requiredValue;
    if (data.category) updateData.category = data.category;
    if (data.metadata) updateData.metadata = JSON.stringify(data.metadata);

    const [badge] = await connection(this.TABLE_NAME)
      .where({ id })
      .update({
        ...updateData,
        updated_at: connection.fn.now(),
      })
      .returning('*');

    return badge ? this.formatRecord(badge) : null;
  }

  /**
   * Deactivates a badge
   * @param id - The badge ID
   * @param trx - Optional transaction
   * @returns True if successful
   */
  static async deactivate(
    id: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || db;
    const result = await connection(this.TABLE_NAME).where({ id }).update({
      is_active: false,
      updated_at: connection.fn.now(),
    });

    return result > 0;
  }

  /**
   * Helper method to format database records
   */
  private static formatRecord(record: any): Badge {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      icon: record.icon,
      requiredAction: record.required_action,
      requiredValue: record.required_value,
      category: record.category,
      isActive: record.is_active,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

// =================================================================
// User Badge Model Class
// =================================================================

export class UserBadgeModel {
  private static readonly TABLE_NAME = 'user_badges';
  private static readonly BADGES_TABLE = 'badges';

  /**
   * Awards a badge to a user
   * @param userId - The user ID
   * @param badgeId - The badge ID
   * @param metadata - Optional metadata
   * @param trx - Optional transaction
   * @returns The user badge record
   */
  static async award(
    userId: string,
    badgeId: string,
    metadata?: Record<string, any>,
    trx?: Knex.Transaction
  ): Promise<UserBadge> {
    const connection = trx || db;

    // Check if badge already earned by user
    const existing = await connection(this.TABLE_NAME)
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    if (existing) {
      return this.formatRecord(existing);
    }

    await connection(this.TABLE_NAME).insert({
      user_id: userId,
      badge_id: badgeId,
      earned_at: connection.fn.now(),
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    return {
      userId,
      badgeId,
      earnedAt: new Date(),
      metadata: metadata || null,
      createdAt: new Date(),
    };
  }

  /**
   * Gets all badges earned by a user
   * @param userId - The user ID
   * @returns Array of user badges with badge details
   */
  static async findByUserId(userId: string): Promise<(UserBadge & Badge)[]> {
    const userBadges = await db(this.TABLE_NAME)
      .join(this.BADGES_TABLE, 'user_badges.badge_id', 'badges.id')
      .where('user_badges.user_id', userId)
      .select(
        'user_badges.*',
        'badges.id as badge_id',
        'badges.name',
        'badges.description',
        'badges.icon',
        'badges.required_action',
        'badges.required_value',
        'badges.category',
        'badges.is_active',
        'badges.metadata as badge_metadata',
        'badges.created_at as badge_created_at',
        'badges.updated_at as badge_updated_at'
      )
      .orderBy('user_badges.earned_at', 'desc');

    return userBadges.map(ub => ({
      ...this.formatRecord(ub),
      id: ub.badge_id,
      name: ub.name,
      description: ub.description,
      icon: ub.icon,
      requiredAction: ub.required_action,
      requiredValue: ub.required_value,
      category: ub.category,
      isActive: ub.is_active,
      metadata: ub.badge_metadata ? JSON.parse(ub.badge_metadata) : null,
      createdAt: ub.badge_created_at,
      updatedAt: ub.badge_updated_at,
    }));
  }

  /**
   * Checks if a user has earned a specific badge
   * @param userId - The user ID
   * @param badgeId - The badge ID
   * @returns True if user has the badge
   */
  static async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const result = await db(this.TABLE_NAME)
      .where({ user_id: userId, badge_id: badgeId })
      .first();

    return !!result;
  }

  /**
   * Gets the number of badges earned by a user
   * @param userId - The user ID
   * @returns Count of badges
   */
  static async countByUserId(userId: string): Promise<number> {
    const result = await db(this.TABLE_NAME)
      .where({ user_id: userId })
      .count('* as count')
      .first();

    return (result?.count as number) || 0;
  }

  /**
   * Revokes a badge from a user
   * @param userId - The user ID
   * @param badgeId - The badge ID
   * @param trx - Optional transaction
   * @returns True if successful
   */
  static async revoke(
    userId: string,
    badgeId: string,
    trx?: Knex.Transaction
  ): Promise<boolean> {
    const connection = trx || db;
    const result = await connection(this.TABLE_NAME)
      .where({ user_id: userId, badge_id: badgeId })
      .delete();

    return result > 0;
  }

  /**
   * Gets users with a specific badge (top earners)
   * @param badgeId - The badge ID
   * @param limit - Max results
   * @returns Array of user IDs
   */
  static async getUsersWithBadge(
    badgeId: string,
    limit: number = 100
  ): Promise<string[]> {
    const results = await db(this.TABLE_NAME)
      .where({ badge_id: badgeId })
      .orderBy('earned_at', 'asc')
      .limit(limit)
      .select('user_id');

    return results.map(r => r.user_id);
  }

  /**
   * Helper method to format database records
   */
  private static formatRecord(record: any): UserBadge {
    return {
      userId: record.user_id,
      badgeId: record.badge_id,
      earnedAt: record.earned_at,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      createdAt: record.created_at,
    };
  }
}
