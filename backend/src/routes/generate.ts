import { Router, Request, Response, NextFunction } from 'express';
import { SkillRouterService } from '../services/SkillRouterService';
import { TestCaseService } from '../services/TestCaseService';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger.js';

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
      throw new ApiError(401, 'Unauthorized');
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
      throw new ApiError(400, 'Missing required fields');
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
        createdById: req.userId,
        title: saveAs,
        description: requirements,
        framework,
        designPattern,
        content: generation.content,
        sourceType: 'manual',
        acceptanceCriteria,
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
