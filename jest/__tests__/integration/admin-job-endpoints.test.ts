import request from 'supertest';
import app from '../../../src/app';
import db from '../../../src/database/connection';
import JobModel from '../../../src/models/Job';
import { CreateUserInput, UserModel } from '../../../src/models/User';
import { getCookie } from '../../test-helpers';

describe('Admin Job endpoints (integration)', () => {
  let adminToken: string | undefined;

  beforeAll(async () => {
    const adminData: CreateUserInput = {
      email: 'admin.job.test@example.com',
      fullName: 'Job Test Admin',
      phoneNumber: '1234567802',
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

    await JobModel.create('test_job_1', { data: 'test 1' });
    await JobModel.create('test_job_2', { data: 'test 2' });
    const job3 = await JobModel.create('test_job_3', { data: 'test 3' });
    await JobModel.updateStatus(job3.id, 'failed', { error: 'test error' });
  });

  afterAll(async () => {
    await db('jobs').where('type', 'like', 'test_job_%').del();
    await db('users')
      .where('email', 'like', '%admin.job.test@example.com')
      .del();
  });

  it('GET /api/v1/admin/jobs/all should return all jobs with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/jobs/all?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toHaveLength(3);
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('GET /api/v1/admin/jobs/:jobId should return a single job', async () => {
    const job = await db('jobs').where('type', 'test_job_1').first();
    const res = await request(app)
      .get(`/api/v1/admin/jobs/${job.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.job.id).toBe(job.id);
    expect(res.body.data.job.type).toBe('test_job_1');
  });

  it('GET /api/v1/admin/dashboard/failed-jobs should return failed jobs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/failed-jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toBeInstanceOf(Array);
    const failedJob = res.body.data.jobs.find(
      (job: any) => job.type === 'test_job_3'
    );
    expect(failedJob).toBeDefined();
    expect(failedJob.status).toBe('failed');
  });
});
