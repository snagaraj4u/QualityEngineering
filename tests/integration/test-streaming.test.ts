import request from 'supertest';

// Set DATABASE_URL for Prisma
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/quality_engineering_test_db';
}

// Mock Prisma before importing app
jest.mock('../../backend/src/utils/db', () => ({
  prisma: {
    executionResult: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { app } from '../../backend/src/index';
import { prisma } from '../../backend/src/utils/db';

describe('SSE Streaming', () => {
  describe('GET /api/test/:executionId/stream', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 404 for non-existent execution', async () => {
      (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/test/non-existent-id/stream')
        .query({ clientId: 'client-123' });

      expect(response.status).toBe(404);
      expect(prisma.executionResult.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
    });

    it('should return 403 for wrong clientId', async () => {
      const mockExecution = {
        id: 'exec-1',
        clientId: 'client-1',
        projectId: 'project-1',
        framework: 'jest',
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        testResults: '[]',
        status: 'IN_PROGRESS',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const response = await request(app)
        .get('/api/test/exec-1/stream')
        .query({ clientId: 'client-2' });

      expect(response.status).toBe(403);
    });

    it('should return 200 with text/event-stream for valid execution', async () => {
      const mockExecution = {
        id: 'exec-1',
        clientId: 'client-1',
        projectId: 'project-1',
        framework: 'jest',
        passed: 5,
        failed: 0,
        skipped: 0,
        duration: 1000,
        testResults: '[]',
        status: 'PASSED', // Completed status so the stream closes immediately
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(mockExecution);

      const response = await request(app)
        .get('/api/test/exec-1/stream')
        .query({ clientId: 'client-1' });

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/event-stream');
    });
  });
});
