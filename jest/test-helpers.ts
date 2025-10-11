import request from 'supertest';
import { CreateUserInput, UserModel } from '../src/models/User';
import db from '../src/database/connection';

export function getCookie(
  response: request.Response,
  cookieName: string
): string | undefined {
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    for (const cookie of setCookieHeader) {
      if (cookie.startsWith(`${cookieName}=`)) {
        return cookie.split(';')[0].split('=')[1];
      }
    }
  }
  return undefined;
}

export const generateTestUsers = async () => {
  try {
    // Create an admin user
    const adminData: CreateUserInput = {
      email: 'admin.test@example.com',
      password: 'Password123!',
      role: 'admin',
    };
    const admin = await UserModel.create(adminData);
    await db('users').where({ id: admin.userId }).update({ is_verified: true });

    // Create a reporter user
    const reporterData: CreateUserInput = {
      email: 'reporter.test@example.com',
      password: 'Password123!',
      role: 'reporter',
    };
    const reporter = await UserModel.create(reporterData);
    await db('users')
      .where({ id: reporter.userId })
      .update({ is_verified: true });

    return { admin, reporter };
  } catch {
    throw new Error('Failed to generate test users');
  }
};
