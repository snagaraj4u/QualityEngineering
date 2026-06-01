import { Router, Request, Response, NextFunction } from 'express';
import { SkillRouterService } from '../services/SkillRouterService';
import { TestCaseService } from '../services/TestCaseService';
import { ApiError } from '../utils/ApiError';
import logger from '../utils/logger';

const router = Router();
const skillRouterService = new SkillRouterService();
const testCaseService = new TestCaseService();

interface AuthRequest extends Request {
  clientId?: string;
  userId?: string;
}

// POST /api/test-cases/generate
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.clientId || !req.userId) {
      throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const {
      projectId,
      framework,
      designPattern,
      requirements,
      acceptanceCriteria,
      saveAs,
    } = req.body;

    if (!projectId || !framework || !designPattern || !requirements) {
      throw new ApiError('Missing required fields', 'INVALID_REQUEST', 400);
    }

    logger.info('Generating test cases', {
      framework,
      designPattern,
    });

    // Generate via Skill Router
    const generation = await skillRouterService.generateTestCase({
      clientId: req.clientId,
      framework,
      designPattern,
      requirements,
      acceptanceCriteria,
    });

    // If saveAs title provided, save directly
    let testCase = null;
    if (saveAs) {
      testCase = await testCaseService.createTestCase({
        projectId,
        title: saveAs,
        description: requirements,
        steps: [],
        expectedResult: generation.content || '',
        status: 'active',
      });
    }

    res.json({
      ...generation,
      testCaseId: testCase?.id,
      testCase,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/test-cases/generate/skills
router.get('/skills', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skills = skillRouterService.listAvailableSkills();
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

// GET /api/test-cases/generate/skills/:framework
router.get('/skills/:framework', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skills = skillRouterService.listSkillsForFramework(req.params.framework);
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

export default router;
