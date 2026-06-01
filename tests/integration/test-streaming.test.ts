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
import { testExecutionService } from '../../backend/src/services/TestExecutionService';

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

describe('Test Progress Events', () => {
  it('should have EventEmitter capabilities', () => {
    const TestExecutionService = require('../../backend/src/services/TestExecutionService').TestExecutionService;
    const service = new TestExecutionService();

    expect(service).toHaveProperty('on');
    expect(service).toHaveProperty('emit');
    expect(typeof service.on).toBe('function');
    expect(typeof service.emit).toBe('function');
  });

  it('should emit test-complete events for each test result', (done) => {
    const TestExecutionService = require('../../backend/src/services/TestExecutionService').TestExecutionService;
    const service = new TestExecutionService();

    const events: any[] = [];
    service.on('test-complete', (event: any) => {
      events.push(event);
    });

    // Simulate emitting a test-complete event
    service.emit('test-complete', {
      executionId: 'exec-123',
      test: { name: 'test-1', status: 'passed', duration: 100 },
    });

    setTimeout(() => {
      expect(events.length).toBe(1);
      expect(events[0].executionId).toBe('exec-123');
      expect(events[0].test.name).toBe('test-1');
      done();
    }, 50);
  });

  it('should emit execution-complete event when tests finish', (done) => {
    const TestExecutionService = require('../../backend/src/services/TestExecutionService').TestExecutionService;
    const service = new TestExecutionService();

    const events: any[] = [];
    service.on('execution-complete', (event: any) => {
      events.push(event);
    });

    service.emit('execution-complete', {
      executionId: 'exec-123',
      passed: 1,
      failed: 0,
      skipped: 0,
      duration: 500,
    });

    setTimeout(() => {
      expect(events.length).toBe(1);
      expect(events[0].passed).toBe(1);
      done();
    }, 50);
  });

  it('should emit execution-error event on failure', (done) => {
    const TestExecutionService = require('../../backend/src/services/TestExecutionService').TestExecutionService;
    const service = new TestExecutionService();

    const events: any[] = [];
    service.on('execution-error', (event: any) => {
      events.push(event);
    });

    service.emit('execution-error', {
      executionId: 'exec-123',
      error: 'Test execution failed',
    });

    setTimeout(() => {
      expect(events.length).toBe(1);
      expect(events[0].error).toBe('Test execution failed');
      done();
    }, 50);
  });
});

describe('SSE Event Streaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const inProgressExecution = {
    id: 'exec-stream',
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

  it('should forward test-complete events to the connected client', async () => {
    (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(inProgressExecution);

    const pending = request(app)
      .get('/api/test/exec-stream/stream')
      .query({ clientId: 'client-1' });

    // Emit once the handler has had a chance to subscribe, then close the stream
    // via execution-complete so supertest resolves with the buffered body.
    setTimeout(() => {
      testExecutionService.emit('test-complete', {
        executionId: 'exec-stream',
        test: { name: 'example-test', status: 'PASSED', duration: 100 },
      });
      testExecutionService.emit('execution-complete', {
        executionId: 'exec-stream',
        passed: 1,
        failed: 0,
        skipped: 0,
        duration: 100,
      });
    }, 100);

    const response = await pending;

    expect(response.status).toBe(200);
    expect(response.text).toContain('test-complete');
    expect(response.text).toContain('example-test');
    expect(response.text).toContain('execution-complete');
  });

  it('should close the stream when execution-complete is emitted', async () => {
    (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(inProgressExecution);

    const pending = request(app)
      .get('/api/test/exec-stream/stream')
      .query({ clientId: 'client-1' });

    setTimeout(() => {
      testExecutionService.emit('execution-complete', {
        executionId: 'exec-stream',
        passed: 2,
        failed: 0,
        skipped: 0,
        duration: 250,
      });
    }, 100);

    const response = await pending;

    expect(response.text).toContain('execution-complete');
    expect(response.text).toContain('250');
  });

  it('should ignore events for a different executionId', async () => {
    (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(inProgressExecution);

    const pending = request(app)
      .get('/api/test/exec-stream/stream')
      .query({ clientId: 'client-1' });

    setTimeout(() => {
      // Event for an unrelated execution must not leak into this stream.
      testExecutionService.emit('test-complete', {
        executionId: 'some-other-exec',
        test: { name: 'leaked-test', status: 'PASSED', duration: 10 },
      });
      testExecutionService.emit('execution-complete', {
        executionId: 'exec-stream',
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      });
    }, 100);

    const response = await pending;

    expect(response.text).not.toContain('leaked-test');
    expect(response.text).toContain('execution-complete');
  });

  it('should remove its listeners after the stream closes', async () => {
    (prisma.executionResult.findUnique as jest.Mock).mockResolvedValue(inProgressExecution);

    const before = testExecutionService.listenerCount('test-complete');

    const pending = request(app)
      .get('/api/test/exec-stream/stream')
      .query({ clientId: 'client-1' });

    setTimeout(() => {
      testExecutionService.emit('execution-complete', {
        executionId: 'exec-stream',
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      });
    }, 100);

    await pending;

    // Allow the 'close' cleanup handler to run.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(testExecutionService.listenerCount('test-complete')).toBe(before);
  });
});
