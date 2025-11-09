import db from '../database/connection';
import { OfferService } from './offer.service';

export class OfferAdminService {
  /**
   * Compute and populate offer_segment_members for an offer.
   * This runs in chunks to avoid loading all users into memory.
   */
  static async computeSegment(offerId: string, chunkSize = 1000) {
    // Remove existing members first
    await db.transaction(async trx => {
      await trx('offer_segment_members').where({ offer_id: offerId }).del();

      let offset = 0;
      while (true) {
        const users = await trx('users')
          .select('id')
          .limit(chunkSize)
          .offset(offset);
        if (!users || users.length === 0) break;

        const ids = users.map(u => u.id);

        // Insert eligible users from this chunk using the DB function for evaluation
        // We use an INSERT ... SELECT to let the DB evaluate eligibility in-set
        await trx.raw(
          `INSERT INTO offer_segment_members(offer_id, user_id)
           SELECT ?::uuid, u.id FROM users u WHERE u.id = ANY(?) AND is_user_eligible_for_offer(?::uuid, u.id)`,
          [offerId, ids, offerId]
        );

        offset += users.length;
      }
    });
  }

  static async getSegmentMembers(offerId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const members = await db('offer_segment_members as s')
      .join('users as u', 's.user_id', 'u.id')
      .where('s.offer_id', offerId)
      .select('u.id', 'u.email', 'u.full_name')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('offer_segment_members')
      .where({ offer_id: offerId })
      .count('* as count')
      .limit(1);

    return { members, total: Number(count) };
  }

  static async getAllSegmentMemberIds(
    offerId: string,
    chunkSize = 1000
  ): Promise<string[]> {
    const memberIds: string[] = [];
    let offset = 0;
    while (true) {
      const members = await db('offer_segment_members')
        .where({ offer_id: offerId })
        .select('user_id')
        .limit(chunkSize)
        .offset(offset);

      if (!members || members.length === 0) {
        break;
      }

      memberIds.push(...members.map(m => m.user_id));
      offset += members.length;
    }
    return memberIds;
  }

  static async previewEligibility(offerId: string, limit = 100) {
    const rows = await db.raw(
      `SELECT u.id, u.email, is_user_eligible_for_offer(?::uuid, u.id) as eligible
       FROM users u
       ORDER BY u.created_at DESC
       LIMIT ?`,
      [offerId, limit]
    );

    // Some drivers nest rows under rows[0]
    return rows.rows || rows;
  }

  /**
   * Bulk redeem for a list of userIds. Returns per-user result summary.
   * This runs sequentially to avoid overwhelming downstream systems;
   * it can be parallelized in a worker with throttling if needed.
   */
  static async bulkRedeem(
    offerId: string,
    userIds: string[],
    price: number,
    discount: number
  ) {
    const results: Array<{ userId: string; success: boolean; error?: string }> =
      [];

    for (const userId of userIds) {
      try {
        // Use OfferService; the DB trigger will enforce eligibility/limits
        await OfferService.redeemOffer(offerId, userId, price, discount);
        results.push({ userId, success: true });
      } catch (err: any) {
        results.push({
          userId,
          success: false,
          error: err.message || String(err),
        });
      }
    }

    return results;
  }
}

export default OfferAdminService;
