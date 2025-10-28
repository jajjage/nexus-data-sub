import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Offer admin endpoints (integration)', () => {
  let adminToken: string | undefined;
  let testOfferId: string;

  beforeAll(async () => {
    const adminData: CreateUserInput = {
      email: 'admin.offer.admin.test@example.com',
      fullName: 'Offer Admin Test',
      phoneNumber: '1234567801',
      password: 'Password123!',
      role: 'admin',
    };
    const admin = await UserModel.create(adminData);
    const adminRole = await db('roles').where('name', 'admin').first();
    await db('users').where({ id: admin.userId }).update({
      is_verified: true,
      role_id: adminRole.id,
    });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminData.email, password: adminData.password });
    adminToken = getCookie(login, 'accessToken');
    expect(adminToken).toBeDefined();

    // Create an offer to operate on
    const resp = await request(app)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Admin endpoints test offer',
        status: 'active',
        discount_type: 'fixed_amount',
        discount_value: 50,
        apply_to: 'all',
      })
      .expect(201);

    testOfferId = resp.body.data.offer.id;
  });

  afterAll(async () => {
    await db('offer_segment_members').where({ offer_id: testOfferId }).del();
    await db('offer_redemptions').where({ offer_id: testOfferId }).del();
    await db('offers').where({ id: testOfferId }).del();
    await db('users')
      .where('email', 'like', '%admin.offer.admin.test@example.com')
      .del();
  });

  it('POST /api/v1/admin/offers/:offerId/compute-segment should return 200', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/offers/${testOfferId}/compute-segment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/admin/offers/:offerId/preview-eligibility should return a preview list', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/offers/${testOfferId}/preview-eligibility`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.preview).toBeDefined();
  });

  it('GET /api/v1/admin/offers/:offerId/eligible-users should paginate results', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/offers/${testOfferId}/eligible-users?page=1&limit=10`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('POST /api/v1/admin/offers/:offerId/redemptions should enqueue a job', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/offers/${testOfferId}/redemptions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fromSegment: true })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
