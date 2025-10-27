// jest/__tests__/unit/models/Offer.test.ts
import db from '../../../../src/database/connection';
import { OfferModel } from '../../../../src/models/Offer';
import { CreateUserInput, UserModel } from '../../../../src/models/User';
import { Offer } from '../../../../src/types/offer.type';

describe('OfferModel', () => {
  let testUserId: string;
  let testOfferId: string;

  beforeAll(async () => {
    // Create a user to associate with offers
    const userData: CreateUserInput = {
      email: 'offer.model.test@example.com',
      fullName: 'Offer Model Test User',
      phoneNumber: '1112223334',
      password: 'Password123!',
      role: 'user',
    };
    const user = await UserModel.create(userData);
    testUserId = user.userId;
  });

  afterAll(async () => {
    // Clean up all created test data
    await db('offers').del();
    await db('users').where({ id: testUserId }).del();
  });

  it('should create a new offer', async () => {
    const offerData: Omit<
      Offer,
      'id' | 'usage_count' | 'created_at' | 'updated_at' | 'deleted_at'
    > = {
      title: 'Model Test Offer',
      description: 'A test offer from the model test',
      status: 'draft',
      discount_type: 'percentage',
      discount_value: 15,
      per_user_limit: 1,
      total_usage_limit: 100,
      apply_to: 'all',
      allow_all: true,
      eligibility_logic: 'all',
      starts_at: new Date(),
      ends_at: null,
      created_by: testUserId,
      code: null,
    };

    const createdOffer = await OfferModel.create(offerData);
    testOfferId = createdOffer.id;

    expect(createdOffer).toBeDefined();
    expect(createdOffer.id).toEqual(testOfferId);
    expect(createdOffer.title).toBe('Model Test Offer');
    expect(createdOffer.created_by).toBe(testUserId);

    const dbOffer = await db('offers').where({ id: testOfferId }).first();
    expect(dbOffer).toBeDefined();
  });

  it('should find an offer by its ID', async () => {
    const foundOffer = await OfferModel.findById(testOfferId);
    expect(foundOffer).toBeDefined();
    expect(foundOffer?.id).toBe(testOfferId);
  });

  it('should update an offer', async () => {
    const updates = {
      title: 'Updated Model Test Offer',
      status: 'active' as const,
    };
    const updatedOffer = await OfferModel.update(testOfferId, updates);

    expect(updatedOffer).toBeDefined();
    expect(updatedOffer?.title).toBe('Updated Model Test Offer');
    expect(updatedOffer?.status).toBe('active');

    const dbOffer = await db('offers').where({ id: testOfferId }).first();
    expect(dbOffer.title).toBe('Updated Model Test Offer');
  });

  it('should soft delete an offer', async () => {
    const result = await OfferModel.softDelete(testOfferId);
    expect(result).toBe(true);

    const dbOffer = await db('offers').where({ id: testOfferId }).first();
    expect(dbOffer.deleted_at).not.toBeNull();
  });
});
