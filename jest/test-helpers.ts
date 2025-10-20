import request from 'supertest';
import db from '../src/database/connection';
import { CreateUserInput, UserModel } from '../src/models/User';

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
      fullName: 'Admin Test',
      phoneNumber: '1234567891',
      password: 'Password123!',
      role: 'admin',
    };
    const admin = await UserModel.create(adminData);
    await db('users').where({ id: admin.userId }).update({ is_verified: true });

    // Create a reporter user
    // Create a normal user
    const userData: CreateUserInput = {
      email: 'user.test@example.com',
      fullName: 'User Test',
      phoneNumber: '1234567892',
      password: 'Password123!',
      role: 'user',
    };
    const user = await UserModel.create(userData);
    await db('users').where({ id: user.userId }).update({ is_verified: true });

    return { admin, user };
  } catch (error) {
    console.error('Error generating test users:', error);
    throw new Error('Failed to generate test users');
  }
};
