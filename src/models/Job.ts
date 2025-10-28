import db from '../database/connection';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobRecord {
  id: string;
  type: string;
  payload: any;
  status: JobStatus;
  attempts: number;
  result?: any;
  created_at?: string;
  updated_at?: string;
}

export class JobModel {
  static async create(type: string, payload: any) {
    const [row] = await db('jobs').insert({ type, payload }).returning('*');
    return row as JobRecord;
  }

  static async fetchPending(limit = 1) {
    return db('jobs')
      .where({ status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(limit);
  }

  static async claimJob(id: string) {
    const updated = await db('jobs')
      .where({ id, status: 'pending' })
      .update({
        status: 'running',
        attempts: db.raw('attempts + 1'),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return updated && updated[0];
  }

  static async updateStatus(id: string, status: JobStatus, result?: any) {
    const update: any = { status, updated_at: db.fn.now() };
    if (result !== undefined) update.result = result;
    await db('jobs').where({ id }).update(update);
  }

  static async findById(id: string) {
    return db('jobs').where({ id }).first();
  }

  static async getAll(
    page: number,
    limit: number
  ): Promise<{ jobs: JobRecord[]; total: number }> {
    const query = db('jobs')
      .select(['*', db.raw('count(*) OVER() as total_count')])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const jobs = await query;
    const total = jobs.length > 0 ? parseInt(jobs[0].total_count, 10) : 0;

    // Remove the temporary count field from the results
    jobs.forEach(j => delete (j as any).total_count);

    return { jobs, total };
  }
}

export default JobModel;
