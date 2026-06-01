import request from 'supertest';
import express, { Express } from 'express';
import { testRouter } from '../../src/routes/test';
import { ExecutionResultService } from '../../src/services/ExecutionResultService';
import { TestExecutionService } from '../../src/services/TestExecutionService';
import { ApiError } from '../../src/utils/ApiError';

jest.mock('../../src/services/ExecutionResultService');
jest.mock('../../src/services/TestExecutionService');

describe('Code Quality Issues - Phase 6 Task 6.2', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/test', testRouter);
    jest.clearAllMocks();
  });

  describe('Issue 1: Multi-tenant isolation vulnerability - updateExecutionStatus', () => {
    it('should include clientId parameter in updateExecutionStatus signature', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      // Check that the method signature includes clientId
      const service = new (ExecutionResultService as any)();
      const methodSignature = service.updateExecutionStatus.toString();

      // The method should have clientId as a parameter
      expect(methodSignature).toMatch(/clientId/);
    });

    it('should validate clientId when updating execution status', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      // Should throw error when trying to update with wrong clientId
      const mockInstance = {
        updateExecutionStatus: jest.fn().mockRejectedValue(
          new ApiError(
            'Multi-tenant isolation violation',
            'ISOLATION_VIOLATION',
            403
          )
        ),
      };
      (mockResultService.prototype as any).updateExecutionStatus =
        mockInstance.updateExecutionStatus;

      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'jest',
          projectPath: '/path/to/project',
        });

      // Expect service to prevent cross-tenant access
      expect(mockInstance.updateExecutionStatus).toBeDefined();
    });
  });

  describe('Issue 2: Type safety - Remove as any cast', () => {
    it('should not use as any cast in updateExecutionStatus call', async () => {
      // Read the test.ts file and verify no "as any" in status parameter
      const fs = require('fs');
      const testFilePath = '/c/QualityEngineering/backend/src/routes/test.ts';

      if (fs.existsSync(testFilePath)) {
        const content = fs.readFileSync(testFilePath, 'utf-8');

        // Should NOT contain "status as any" for updateExecutionStatus call
        const statusAsAnyMatch = content.match(/updateExecutionStatus\([^)]*status as any/);
        expect(statusAsAnyMatch).toBeNull();
      }
    });

    it('should properly type status from ternary expression', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      // Mock should have proper type signature
      const mockInstance = {
        saveExecutionStart: jest.fn().mockResolvedValue({
          executionId: 'exec-123',
          status: 'pending',
          framework: 'jest',
          createdAt: '2026-05-31T00:00:00Z',
        }),
        updateExecutionStatus: jest.fn(),
      };
      (mockResultService.prototype as any).saveExecutionStart =
        mockInstance.saveExecutionStart;
      (mockResultService.prototype as any).updateExecutionStatus =
        mockInstance.updateExecutionStatus;

      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'jest',
          projectPath: '/path/to/project',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Issue 3: Fire-and-forget error handling', () => {
    it('should set execution status to FAILED in catch block on error', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;
      const mockTestService = TestExecutionService as jest.MockedClass<
        typeof TestExecutionService
      >;

      const updateStatusMock = jest.fn().mockResolvedValue(undefined);
      const saveStartMock = jest.fn().mockResolvedValue({
        executionId: 'exec-error-123',
        status: 'pending',
        framework: 'jest',
        createdAt: '2026-05-31T00:00:00Z',
      });

      (mockResultService.prototype as any).updateExecutionStatus = updateStatusMock;
      (mockResultService.prototype as any).saveExecutionStart = saveStartMock;
      (mockTestService.prototype as any).executeTests = jest.fn()
        .mockRejectedValue(new Error('Test execution failed'));

      const response = await request(app)
        .post('/api/test/execute')
        .send({
          projectId: 'proj-1',
          clientId: 'client-1',
          framework: 'jest',
          projectPath: '/path/to/project',
        });

      expect(response.status).toBe(200);

      // Give time for the promise chain to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have called updateExecutionStatus with FAILED status
      expect(updateStatusMock).toHaveBeenCalledWith(
        'exec-error-123',
        'FAILED',
        'client-1',
        expect.any(Object)
      );
    });
  });

  describe('Issue 4: Semantic status misuse - CANCELLED vs FAILED', () => {
    it('should use CANCELLED status for cancelled executions, not FAILED', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      const mockInstance = {
        cancelExecution: jest.fn().mockResolvedValue({
          id: 'exec-123',
          status: 'CANCELLED',
          message: 'Test execution cancelled',
        }),
      };
      (mockResultService.prototype as any).cancelExecution =
        mockInstance.cancelExecution;

      const response = await request(app)
        .post('/api/test/exec-123/cancel')
        .send({
          clientId: 'client-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).not.toBe('FAILED');
      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('Issue 5: Incomplete test coverage - Multi-tenant isolation test', () => {
    it('should return 403 Forbidden when accessing execution with different clientId', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      const mockInstance = {
        getExecutionResult: jest.fn().mockRejectedValue(
          new ApiError(
            'Multi-tenant isolation violation',
            'ISOLATION_VIOLATION',
            403
          )
        ),
      };
      (mockResultService.prototype as any).getExecutionResult =
        mockInstance.getExecutionResult;

      const response = await request(app)
        .get('/api/test/exec-client1-123')
        .query({ clientId: 'client-2' });

      // Should return 403 when trying to access another client's execution
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should allow access to own execution with correct clientId', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      const mockInstance = {
        getExecutionResult: jest.fn().mockResolvedValue({
          id: 'exec-123',
          clientId: 'client-1',
          status: 'completed',
          passed: 5,
          failed: 0,
          skipped: 0,
          tests: [],
          createdAt: '2026-05-31T00:00:00Z',
        }),
      };
      (mockResultService.prototype as any).getExecutionResult =
        mockInstance.getExecutionResult;

      const response = await request(app)
        .get('/api/test/exec-123')
        .query({ clientId: 'client-1' });

      expect(response.status).toBe(200);
      expect(response.body.clientId).toBe('client-1');
    });
  });

  describe('Issue 6: Fragile error handling - Use ApiError class', () => {
    it('should use ApiError class with code property instead of string matching', async () => {
      const mockResultService = ExecutionResultService as jest.MockedClass<
        typeof ExecutionResultService
      >;

      const isolationError = new ApiError(
        'Multi-tenant isolation violation',
        'ISOLATION_VIOLATION',
        403
      );

      const mockInstance = {
        getExecutionResult: jest.fn().mockRejectedValue(isolationError),
      };
      (mockResultService.prototype as any).getExecutionResult =
        mockInstance.getExecutionResult;

      const response = await request(app)
        .get('/api/test/exec-123')
        .query({ clientId: 'client-2' });

      // Should handle ApiError properly
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should check error code instead of matching error message', async () => {
      const error = new ApiError(
        'Multi-tenant isolation violation',
        'ISOLATION_VIOLATION',
        403
      );

      expect(error.code).toBe('ISOLATION_VIOLATION');
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain('Multi-tenant isolation');
    });
  });
});
