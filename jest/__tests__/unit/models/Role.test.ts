// __tests__/unit/models/Role.test.ts
import { RoleModel } from '../../../../src/models/Role';
import db from '../../../../src/database/connection';

describe('RoleModel', () => {
  describe('findByName', () => {
    it('should find a role by its name', async () => {
      // Arrange: Insert a test role using Knex
      const testRole = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'test-admin',
        description: 'A temporary admin role for testing',
      };
      await db('roles').insert(testRole);

      // Act
      const role = await RoleModel.findByName('test-admin');

      // Assert
      expect(role).toBeDefined();
      expect(role?.id).toBe(testRole.id);
      expect(role?.name).toBe(testRole.name);
    });

    it('should return undefined for a non-existent role', async () => {
      // Arrange
      const nonExistentName = 'non-existent-role';

      // Act
      const role = await RoleModel.findByName(nonExistentName);

      // Assert
      expect(role).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find a role by its ID', async () => {
      // Arrange
      const testRole = {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'test-viewer',
        description: 'A temporary viewer role for testing',
      };
      await db('roles').insert(testRole);

      // Act
      const role = await RoleModel.findById(testRole.id);

      // Assert
      expect(role).toBeDefined();
      expect(role?.id).toBe(testRole.id);
      expect(role?.name).toBe(testRole.name);
    });

    it('should return undefined for a non-existent ID', async () => {
      // Act
      const role = await RoleModel.findById(
        '00000000-0000-0000-0000-000000000000'
      );

      // Assert
      expect(role).toBeUndefined();
    });
  });
});
