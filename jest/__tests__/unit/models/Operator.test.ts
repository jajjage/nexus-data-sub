import db from '../../../../src/database/connection';
import { OperatorModel } from '../../../../src/models/Operator';

describe('OperatorModel', () => {
  let testOperator: any;

  beforeEach(async () => {
    // Create a test operator before each test
    testOperator = await OperatorModel.create({
      code: 'TEST',
      name: 'Test Operator',
      isoCountry: 'NG',
    });
  });

  afterEach(async () => {
    // Clean up the test operator after each test
    if (testOperator?.id) {
      await db('operators').where({ id: testOperator.id }).del();
    }
  });

  describe('create', () => {
    it('should create a new operator', async () => {
      // The operator is already created in beforeEach, so we just check it
      expect(testOperator).toBeDefined();
      expect(testOperator.id).toBeDefined();
      expect(testOperator.code).toBe('TEST');
      expect(testOperator.name).toBe('Test Operator');
      expect(testOperator.isoCountry).toBe('NG');
    });
  });

  describe('findById', () => {
    it('should retrieve an operator by ID', async () => {
      const operator = await OperatorModel.findById(testOperator.id);
      expect(operator).toBeDefined();
      expect(operator?.id).toBe(testOperator.id);
      expect(operator?.code).toBe(testOperator.code);
      expect(operator?.name).toBe(testOperator.name);
    });

    it('should return null for non-existent operator', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const operator = await OperatorModel.findById(nonExistentId);
      expect(operator).toBeNull();
    });
  });

  describe('findAll', () => {
    let anotherOperator: any;
    beforeEach(async () => {
      // Create an additional operator for this test suite
      anotherOperator = await OperatorModel.create({
        code: 'TEST2',
        name: 'Test Operator 2',
        isoCountry: 'GH',
      });
    });

    afterEach(async () => {
      // Clean up the additional operator
      if (anotherOperator?.id) {
        await db('operators').where({ id: anotherOperator.id }).del();
      }
    });

    it('should retrieve all operators', async () => {
      const operators = await OperatorModel.findAll();
      expect(operators).toBeDefined();
      expect(Array.isArray(operators)).toBe(true);
      // Check that at least our two operators are there
      expect(operators.length).toBeGreaterThanOrEqual(2);
      const operatorCodes = operators.map(op => op.code);
      expect(operatorCodes).toContain('TEST');
      expect(operatorCodes).toContain('TEST2');
    });
  });

  describe('update', () => {
    it('should update an operator', async () => {
      const updatedOperator = await OperatorModel.update(testOperator.id, {
        name: 'Updated Test Operator',
        isoCountry: 'ZA',
      });

      expect(updatedOperator).toBeDefined();
      expect(updatedOperator.id).toBe(testOperator.id);
      expect(updatedOperator.name).toBe('Updated Test Operator');
      expect(updatedOperator.isoCountry).toBe('ZA');

      // Verify the update in the database
      const operatorFromDb = await OperatorModel.findById(testOperator.id);
      expect(operatorFromDb?.name).toBe('Updated Test Operator');
      expect(operatorFromDb?.isoCountry).toBe('ZA');
    });

    it('should throw an error when updating a non-existent operator', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await expect(
        OperatorModel.update(nonExistentId, {
          name: 'Non-existent Operator',
        })
      ).rejects.toThrow('Operator not found');
    });
  });

  describe('delete', () => {
    it('should delete an operator', async () => {
      const isDeleted = await OperatorModel.delete(testOperator.id);
      expect(isDeleted).toBe(true);

      // Verify that the operator is no longer in the database
      const operator = await OperatorModel.findById(testOperator.id);
      expect(operator).toBeNull();
    });

    it('should return false when trying to delete a non-existent operator', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const isDeleted = await OperatorModel.delete(nonExistentId);
      expect(isDeleted).toBe(false);
    });
  });
});
