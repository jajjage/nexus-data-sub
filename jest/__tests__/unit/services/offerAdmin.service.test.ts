import { OfferService } from '../../../../src/services/offer.service';
import OfferAdminService from '../../../../src/services/offerAdmin.service';

describe('OfferAdminService.bulkRedeem', () => {
  const originalRedeem = OfferService.redeemOffer;

  afterEach(() => {
    // restore
    OfferService.redeemOffer = originalRedeem;
  });

  it('returns success for users where OfferService.redeemOffer succeeds and records failures', async () => {
    // Mock behavior: succeed for first id, throw for second
    const calls: string[] = [];
    OfferService.redeemOffer = jest.fn(
      async (offerId: string, userId: string) => {
        calls.push(userId);
        if (userId.endsWith('fail')) throw new Error('failed to redeem');
        return;
      }
    ) as any;

    const results = await OfferAdminService.bulkRedeem(
      'offer-1',
      ['u1', 'u2-fail', 'u3'],
      100,
      10
    );
    expect(results.length).toBe(3);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    expect(successCount).toBe(2);
    expect(failCount).toBe(1);
  });
});
