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
}

export default JobModel;
