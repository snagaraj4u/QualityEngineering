import { TestExecutionService } from '../../backend/src/services/TestExecutionService';

/**
 * Unit coverage for TestExecutionService.executeTests.
 *
 * executeTests is fire-and-forget: it validates the framework, persists a
 * pending ExecutionResult, emits `execution-started`, kicks off the run
 * asynchronously, and returns the executionId. (Per-test results and the
 * terminal status are delivered via the SSE stream / API, covered by the
 * integration suites.) These mocks isolate that synchronous contract.
 */
jest.mock('../../backend/src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const create = jest.fn();
const update = jest.fn();
jest.mock('../../backend/src/utils/db', () => ({
  prisma: {
    executionResult: {
      create: (...args: unknown[]) => create(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

const runner = jest.fn();
jest.mock('../../backend/src/utils/executors', () => ({
  executeTests: jest.fn(),
  parseCucumberReport: jest.fn(),
  parseJestReport: jest.fn(),
  executeCucumber: (...args: unknown[]) => runner(...args),
  executeJest: (...args: unknown[]) => runner(...args),
  executeCypress: (...args: unknown[]) => runner(...args),
  executeSelenium: (...args: unknown[]) => runner(...args),
}));

describe('TestExecutionService.executeTests', () => {
  let service: TestExecutionService;

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockResolvedValue({ id: 'exec-1' });
    update.mockResolvedValue({ id: 'exec-1', passed: 0, failed: 0, skipped: 0, duration: 0 });
    // Keep the fire-and-forget async path inert and deterministic.
    runner.mockResolvedValue({ tests: [], duration: 0 });
    service = new TestExecutionService();
  });

  it('returns the persisted executionId', async () => {
    const id = await service.executeTests({
      projectPath: '/path/to/project',
      projectId: 'proj-1',
      clientId: 'client-1',
      framework: 'jest',
    });

    expect(id).toBe('exec-1');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('emits execution-started with the executionId and framework', async () => {
    const started = jest.fn();
    service.on('execution-started', started);

    await service.executeTests({
      projectPath: '/path/to/project',
      projectId: 'proj-1',
      clientId: 'client-1',
      framework: 'cucumber',
    });

    expect(started).toHaveBeenCalledWith({ executionId: 'exec-1', framework: 'cucumber' });
  });

  it('rejects an unsupported framework before persisting anything', async () => {
    await expect(
      service.executeTests({
        projectPath: '/path/to/project',
        projectId: 'proj-1',
        clientId: 'client-1',
        framework: 'invalid-framework' as never,
      })
    ).rejects.toThrow(/unsupported framework/i);

    expect(create).not.toHaveBeenCalled();
  });
});
