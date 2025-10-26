import db from '../database/connection';

export interface StaffProfile {
  userId: string;
  assignedChannels: number;
}

export class StaffModel {
  /**
   * Finds available staff members (staff or admin).
   * @returns A list of available staff members.
   */
  static async findAvailableStaff(): Promise<StaffProfile[]> {
    const staff = await db('users as u')
      .leftJoin(
        db('channel_members as cm')
          .select('user_id')
          .count('* as assigned_channels')
          .where('role', 'admin')
          .groupBy('user_id')
          .as('ac'),
        'u.id',
        'ac.user_id'
      )
      .select(
        'u.id',
        db.raw('COALESCE(ac.assigned_channels, 0) as assigned_channels')
      )
      .whereIn('u.role', ['staff', 'admin'])
      .orderBy('assigned_channels', 'asc');

    return staff.map(s => ({
      userId: s.id,
      assignedChannels: parseInt(s.assigned_channels, 10),
    }));
  }
}
