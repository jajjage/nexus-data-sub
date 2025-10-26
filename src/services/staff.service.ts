import { StaffModel } from '../models/Staff';

export class StaffService {
  /**
   * Assigns an available staff member to a support channel.
   * @returns The ID of the assigned staff member, or null if none are available.
   */
  static async assignStaffToChannel(): Promise<string | null> {
    const availableStaff = await StaffModel.findAvailableStaff();

    if (availableStaff.length === 0) {
      return null;
    }

    // Simple logic: assign the staff with the fewest channels.
    // In a real app, this could be more complex (e.g., round-robin, skills-based).
    return availableStaff[0].userId;
  }
}
