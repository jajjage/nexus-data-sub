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
  // Generate unique test user emails using timestamp to avoid duplicates across test runs
  const timestamp = Date.now();

  // Create an admin user
  const adminData: CreateUserInput = {
    email: `admin.test+${timestamp}@example.com`,
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
    email: `user.test+${timestamp}@example.com`,
    fullName: 'User Test',
    phoneNumber: '1234567892',
    password: 'Password123!',
    role: 'user',
  };
  const user = await UserModel.create(userData);
  await db('users').where({ id: user.userId }).update({ is_verified: true });

  // Create a wallet for the user
  await db('wallets').insert({
    user_id: user.userId,
    balance: 1000, // Give the user some initial balance for testing
    currency: 'NGN',
  });

  const userRole = await db('roles').where({ name: 'user' }).first();
  const userPermissions = await db('role_permissions')
    .join('permissions', 'role_permissions.permission_id', 'permissions.id')
    .where({ role_id: userRole.id })
    .select('permissions.name');

  user.permissions = userPermissions.map(p => p.name);

  return { admin, user };
};
