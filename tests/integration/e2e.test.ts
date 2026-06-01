import request from 'supertest';

/**
 * True end-to-end integration against a REAL database.
 *
 * This suite is skipped unless DATABASE_URL is set (and the schema migrated),
 * so it does NOT run in the default `npx jest` here — it is intended for CI,
 * where the pipeline provisions Postgres (see the Phase 10 GitHub Actions job).
 *
 * Only the genuinely external edges are stubbed: QMetry (network) and the test
 * executors (would spawn real framework runners). Everything else — Express
 * routing, the services, and Prisma persistence — is exercised for real.
 */

jest.mock('../../backend/src/services/QMetryService', () => {
  const createDefect = jest.fn().mockResolvedValue({ defectId: 'QM-E2E-1' });
  const getDefect = jest.fn().mockResolvedValue({ status: 'Resolved' });
  return {
    __esModule: true,
    QMetryService: jest.fn().mockImplementation(() => ({ createDefect, getDefect })),
  };
});

// Stub the executor so POST /api/test/execute doesn't spawn a real runner.
jest.mock('../../backend/src/utils/executors', () => ({
  __esModule: true,
  executeTests: jest.fn().mockResolvedValue({
    passed: 0,
    failed: 1,
    skipped: 0,
    duration: 10,
    tests: [{ name: 'login', status: 'FAILED', duration: 10 }],
  }),
  parseCucumberReport: jest.fn(),
  parseJestReport: jest.fn(),
}));

import { app } from '../../backend/src/index';
import { prisma } from '../../backend/src/utils/db';

const describeE2E = process.env.DATABASE_URL ? describe : describe.skip;

describeE2E('End-to-End pipeline (live DB)', () => {
  let clientId: string;
  let projectId: string;
  let userId: string;
  let testCaseId: string;
  let defectId: string;

  beforeAll(async () => {
    const stamp = Date.now();
    const client = await prisma.client.create({
      data: { name: 'E2E Client', email: `e2e-${stamp}@example.com` },
    });
    clientId = client.id;

    const project = await prisma.project.create({
      data: {
        name: 'E2E Project',
        clientId,
        framework: 'cucumber',
        designPattern: 'BDD',
      },
    });
    projectId = project.id;

    const user = await prisma.user.create({
      data: {
        email: `e2e-user-${stamp}@example.com`,
        name: 'E2E User',
        password: 'hashed',
        clientId,
      },
    });
    userId = user.id;

    const testCase = await prisma.testCase.create({
      data: { name: 'Login flow', projectId, userId },
    });
    testCaseId = testCase.id;
  });

  afterAll(async () => {
    // Cascades to projects -> test cases/defects, executions, users.
    if (clientId) {
      await prisma.client.delete({ where: { id: clientId } });
    }
    await prisma.$disconnect();
  });

  it('starts a test execution and persists it', async () => {
    const res = await request(app).post('/api/test/execute').send({
      projectId,
      clientId,
      framework: 'cucumber',
      projectPath: '/tmp/e2e-project',
    });

    expect(res.status).toBe(200);
    expect(res.body.executionId).toBeDefined();

    const row = await prisma.executionResult.findUnique({
      where: { id: res.body.executionId },
    });
    expect(row?.clientId).toBe(clientId);
  });

  it('creates a defect for a failed test and persists it', async () => {
    const res = await request(app).post('/api/defects').send({
      projectId,
      testCaseId,
      title: 'Login button not clickable',
      description: 'User cannot click login button',
      severity: 'high',
      clientId,
    });

    expect(res.status).toBe(201);
    defectId = res.body.id;
    expect(res.body.qmetryId).toBe('QM-E2E-1');

    const row = await prisma.defect.findUnique({ where: { id: defectId } });
    expect(row?.testCaseId).toBe(testCaseId);
    expect(row?.status).toBe('OPEN');
  });

  it('lists and fetches the created defect (tenant-scoped)', async () => {
    const list = await request(app).get('/api/defects').query({ projectId, clientId });
    expect(list.status).toBe(200);
    expect(list.body.some((d: { id: string }) => d.id === defectId)).toBe(true);

    const one = await request(app).get(`/api/defects/${defectId}`).query({ clientId });
    expect(one.status).toBe(200);
    expect(one.body.id).toBe(defectId);
  });

  it('reflects the new data in dashboard metrics', async () => {
    const res = await request(app).get('/api/dashboard/metrics').query({ clientId });

    expect(res.status).toBe(200);
    expect(res.body.totalTestCases).toBeGreaterThanOrEqual(1);
    expect(res.body.defectSummary.open).toBeGreaterThanOrEqual(1);
  });

  it('syncs the defect status from QMetry', async () => {
    const res = await request(app).patch(`/api/defects/${defectId}/sync`).send({ clientId });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RESOLVED');

    const row = await prisma.defect.findUnique({ where: { id: defectId } });
    expect(row?.status).toBe('RESOLVED');
    expect(row?.qmetrySyncedAt).not.toBeNull();
  });
});
