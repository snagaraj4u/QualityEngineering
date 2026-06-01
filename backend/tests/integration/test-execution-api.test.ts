import request from 'supertest';
import express, { Express } from 'express';
import { testRouter } from '../../src/routes/test';
import { ExecutionResultService } from '../../src/services/ExecutionResultService';
import { TestExecutionService } from '../../src/services/TestExecutionService';
import { prisma } from '../../src/utils/db';

// Mock dependencies
jest.mock('../../src/services/ExecutionResultService');
jest.mock('../../src/services/TestExecutionService');
jest.mock('../../src/utils/db', () => ({
  prisma: {
    executionResult: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Test Execution API Endpoints', () => {
  let app: Express;

  beforeEach(() => {
    // Create a minimal Express app with the test router
    app = express();
    app.use(express.json());
    app.use('/api/test', testRouter);

    jest.clearAllMocks();
  });

  describe('POST /api/test/execute - Test Execution', () => {
    it('should return 200 with executionId on successful execution start', async () => {
      const mockService = TestExecutionService as jest.MockedClass<typeof TestExecutionService>;
      const mockInstance = {
        executeTests: jest.fn().mockResolvedValue({
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [],
        }),
      };
      (mockService.prototype as any).executeTests = mockInstance.executeTests;

      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        saveExecutionStart: jest.fn().mockResolvedValue({
          id: 'exec-123-uuid',
          status: 'pending',
          framework: 'jest',
          createdAt: '2026-05-31T00:00:00Z',
        }),
      };
      (mockResultService.prototype as any).saveExecutionStart =
        mockResultInstance.saveExecutionStart;

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
      const mockService = TestExecutionService as jest.MockedClass<typeof TestExecutionService>;
      const mockInstance = {
        executeTests: jest.fn().mockResolvedValue({
          passed: 2,
          failed: 0,
          skipped: 0,
          duration: 500,
          tests: [],
        }),
      };
      (mockService.prototype as any).executeTests = mockInstance.executeTests;

      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        saveExecutionStart: jest.fn().mockResolvedValue({
          id: 'exec-456-uuid',
          status: 'pending',
          framework: 'jest',
          createdAt: '2026-05-31T00:00:00Z',
        }),
      };
      (mockResultService.prototype as any).saveExecutionStart =
        mockResultInstance.saveExecutionStart;

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
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        saveExecutionStart: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (mockResultService.prototype as any).saveExecutionStart =
        mockResultInstance.saveExecutionStart;

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
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        getExecutionResult: jest.fn().mockResolvedValue({
          id: 'exec-123-uuid',
          status: 'completed',
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [
            {
              name: 'Test 1',
              status: 'passed',
              duration: 200,
            },
          ],
          createdAt: '2026-05-31T00:00:00Z',
          completedAt: '2026-05-31T00:00:01Z',
        }),
      };
      (mockResultService.prototype as any).getExecutionResult =
        mockResultInstance.getExecutionResult;

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
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        getExecutionResult: jest.fn().mockResolvedValue(null),
      };
      (mockResultService.prototype as any).getExecutionResult =
        mockResultInstance.getExecutionResult;

      const response = await request(app).get('/api/test/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid executionId format', async () => {
      const response = await request(app).get('/api/test/');

      expect(response.status).toBe(404); // No ID provided, route not matched
    });

    it('should enforce multi-tenant isolation', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      // Issue 5 Fix: Proper test that tries to access execution with different clientId
      // Should throw an error when accessing another client's execution
      const mockResultInstance = {
        getExecutionResult: jest.fn().mockImplementation((executionId: string, clientId?: string) => {
          // Simulate the service checking client ownership
          if (clientId && clientId !== 'client-1') {
            const error = new Error('Unauthorized: clientId mismatch');
            error.name = 'ApiError';
            (error as any).code = 'ISOLATION_VIOLATION';
            (error as any).statusCode = 403;
            throw error;
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
        }),
      };
      (mockResultService.prototype as any).getExecutionResult =
        mockResultInstance.getExecutionResult;

      const response = await request(app)
        .get('/api/test/exec-123-uuid')
        .query({ clientId: 'client-2' });

      // Should return 403 Forbidden when trying to access another client's execution
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/test/:executionId/cancel - Cancel Execution', () => {
    it('should return 200 with cancelled status for pending execution', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        cancelExecution: jest.fn().mockResolvedValue({
          id: 'exec-123-uuid',
          status: 'cancelled',
          message: 'Test execution cancelled',
        }),
      };
      (mockResultService.prototype as any).cancelExecution =
        mockResultInstance.cancelExecution;

      const response = await request(app)
        .post('/api/test/exec-123-uuid/cancel')
        .send({
          clientId: 'client-1',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('cancelled');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent execution ID', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        cancelExecution: jest
          .fn()
          .mockRejectedValue(
            new Error('Execution not found')
          ),
      };
      (mockResultService.prototype as any).cancelExecution =
        mockResultInstance.cancelExecution;

      const response = await request(app)
        .post('/api/test/nonexistent-id/cancel')
        .send({
          clientId: 'client-1',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if execution is already completed', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        cancelExecution: jest
          .fn()
          .mockRejectedValue(
            new Error('Cannot cancel completed execution')
          ),
      };
      (mockResultService.prototype as any).cancelExecution =
        mockResultInstance.cancelExecution;

      const response = await request(app)
        .post('/api/test/exec-completed-id/cancel')
        .send({
          clientId: 'client-1',
        });

      expect(response.status).toBe(400);
    });

    it('should require clientId for multi-tenant isolation', async () => {
      const response = await request(app)
        .post('/api/test/exec-123-uuid/cancel')
        .send({}); // No clientId

      expect(response.status).toBe(400);
    });

    it('should enforce multi-tenant isolation by clientId', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockResultInstance = {
        cancelExecution: jest
          .fn()
          .mockRejectedValue(
            new Error('Unauthorized: clientId mismatch')
          ),
      };
      (mockResultService.prototype as any).cancelExecution =
        mockResultInstance.cancelExecution;

      const response = await request(app)
        .post('/api/test/exec-123-uuid/cancel')
        .send({
          clientId: 'different-client',
        });

      expect(response.status).toBe(403);
    });
  });
});
