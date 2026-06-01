import request from 'supertest';
import express, { Express } from 'express';

/**
 * Mock the service modules with factories whose instance methods (and the
 * shared `testExecutionService` singleton) reference module-level jest.fn()s.
 *
 * This matters: the router instantiates `new ExecutionResultService()` and
 * imports the `testExecutionService` singleton at import time. Jest's default
 * automock assigns mock methods as *own* properties on each constructed
 * instance, so reconfiguring `MockedClass.prototype.method` after import never
 * reaches the instance the router actually holds. By returning objects that
 * close over the same jest.fn()s, every instance — including the router's —
 * shares one configurable mock.
 */
jest.mock('../../src/services/ExecutionResultService', () => {
  const saveExecutionStart = jest.fn();
  const getExecutionResult = jest.fn();
  const cancelExecution = jest.fn();
  const updateExecutionStatus = jest.fn();
  return {
    __esModule: true,
    ExecutionResultService: jest.fn().mockImplementation(() => ({
      saveExecutionStart,
      getExecutionResult,
      cancelExecution,
      updateExecutionStatus,
    })),
  };
});

jest.mock('../../src/services/TestExecutionService', () => {
  const executeTests = jest.fn();
  return {
    __esModule: true,
    TestExecutionService: jest.fn().mockImplementation(() => ({ executeTests })),
    testExecutionService: { executeTests },
  };
});

import { testRouter } from '../../src/routes/test';
import { ExecutionResultService } from '../../src/services/ExecutionResultService';
import { testExecutionService } from '../../src/services/TestExecutionService';
import { ApiError } from '../../src/utils/ApiError';

// All mocked instances share the same jest.fn()s, so a throwaway instance gives
// handles to the exact mocks the router uses.
const sharedErs = new ExecutionResultService() as unknown as {
  saveExecutionStart: jest.Mock;
  getExecutionResult: jest.Mock;
  cancelExecution: jest.Mock;
  updateExecutionStatus: jest.Mock;
};
const saveExecutionStart = sharedErs.saveExecutionStart;
const getExecutionResult = sharedErs.getExecutionResult;
const cancelExecution = sharedErs.cancelExecution;
const executeTests = (testExecutionService as unknown as { executeTests: jest.Mock }).executeTests;

describe('Test Execution API Endpoints', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/test', testRouter);

    jest.clearAllMocks();
    // The execute route fires executeTests(...).catch(...) and ignores the
    // result, so a resolved default keeps the happy path from throwing.
    executeTests.mockResolvedValue(undefined);
  });

  describe('POST /api/test/execute - Test Execution', () => {
    it('should return 200 with executionId on successful execution start', async () => {
      saveExecutionStart.mockResolvedValue({
        executionId: 'exec-123-uuid',
        status: 'pending',
        framework: 'jest',
        createdAt: '2026-05-31T00:00:00Z',
      });

      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'jest',
          projectPath: '/path/to/project',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('executionId');
      expect(response.body.status).toBe('pending');
      expect(response.body.framework).toBe('jest');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          // Missing clientId
          framework: 'jest',
          projectPath: '/path/to/project',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid framework', async () => {
      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'invalid-framework',
          projectPath: '/path/to/project',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/framework/i);
    });

    it('should accept optional testPattern', async () => {
      saveExecutionStart.mockResolvedValue({
        executionId: 'exec-456-uuid',
        status: 'pending',
        framework: 'jest',
        createdAt: '2026-05-31T00:00:00Z',
      });

      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'jest',
          projectPath: '/path/to/project',
          testPattern: '**/*.test.ts',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('executionId');
    });

    it('should return 500 on service error', async () => {
      saveExecutionStart.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'jest',
          projectPath: '/path/to/project',
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/test/:executionId - Get Execution Result', () => {
    it('should return 200 with execution result', async () => {
      getExecutionResult.mockResolvedValue({
        id: 'exec-123-uuid',
        status: 'completed',
        passed: 5,
        failed: 0,
        skipped: 0,
        duration: 1000,
        tests: [{ name: 'Test 1', status: 'passed', duration: 200 }],
        createdAt: '2026-05-31T00:00:00Z',
        completedAt: '2026-05-31T00:00:01Z',
      });

      const response = await request(app).get('/api/test/exec-123-uuid');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('passed');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('skipped');
      expect(response.body).toHaveProperty('duration');
      expect(response.body).toHaveProperty('tests');
      expect(response.body.tests).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent execution ID', async () => {
      getExecutionResult.mockResolvedValue(null);

      const response = await request(app).get('/api/test/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid executionId format', async () => {
      const response = await request(app).get('/api/test/');

      expect(response.status).toBe(404); // No ID provided, route not matched
    });

    it('should enforce multi-tenant isolation', async () => {
      // The real service throws an ApiError with ISOLATION_VIOLATION on a
      // clientId mismatch; mirror that so the route's instanceof check applies.
      getExecutionResult.mockImplementation((_executionId: string, clientId?: string) => {
        if (clientId && clientId !== 'client-1') {
          throw new ApiError('Multi-tenant isolation violation', 'ISOLATION_VIOLATION', 403);
        }
        return Promise.resolve({
          id: 'exec-123-uuid',
          clientId: 'client-1',
          status: 'completed',
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [],
          createdAt: '2026-05-31T00:00:00Z',
        });
      });

      const response = await request(app)
        .get('/api/test/exec-123-uuid')
        .query({ clientId: 'client-2' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/test/:executionId/cancel - Cancel Execution', () => {
    it('should return 200 with cancelled status for pending execution', async () => {
      cancelExecution.mockResolvedValue({
        id: 'exec-123-uuid',
        status: 'cancelled',
        message: 'Test execution cancelled',
      });

      const response = await request(app)
        .post('/api/test/exec-123-uuid/cancel')
        .send({ clientId: 'client-1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('cancelled');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent execution ID', async () => {
      cancelExecution.mockRejectedValue(new Error('Execution not found'));

      const response = await request(app)
        .post('/api/test/nonexistent-id/cancel')
        .send({ clientId: 'client-1' });

      expect(response.status).toBe(404);
    });

    it('should return 400 if execution is already completed', async () => {
      cancelExecution.mockRejectedValue(new Error('Cannot cancel completed execution'));

      const response = await request(app)
        .post('/api/test/exec-completed-id/cancel')
        .send({ clientId: 'client-1' });

      expect(response.status).toBe(400);
    });

    it('should require clientId for multi-tenant isolation', async () => {
      const response = await request(app)
        .post('/api/test/exec-123-uuid/cancel')
        .send({}); // No clientId

      expect(response.status).toBe(400);
    });

    it('should enforce multi-tenant isolation by clientId', async () => {
      // Real service throws ApiError(ISOLATION_VIOLATION, 403) on mismatch.
      cancelExecution.mockRejectedValue(
        new ApiError('Multi-tenant isolation violation', 'ISOLATION_VIOLATION', 403)
      );

      const response = await request(app)
        .post('/api/test/exec-123-uuid/cancel')
        .send({ clientId: 'different-client' });

      expect(response.status).toBe(403);
    });
  });
});
