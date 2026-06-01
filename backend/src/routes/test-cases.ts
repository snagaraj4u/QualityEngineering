import express, { Router, Request, Response } from 'express';
import { TestCaseService } from '../services/TestCaseService';

const router = Router();
const testCaseService = new TestCaseService();

router.post('/', async (req: Request, res: Response) => {
  try {
    const testCase = await testCaseService.createTestCase(req.body);
    res.status(201).json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create test case' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const testCase = await testCaseService.getTestCase(req.params.id);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test case' });
  }
});

router.get('/project/:projectId', async (req: Request, res: Response) => {
  try {
    const testCases = await testCaseService.listTestCases(req.params.projectId);
    res.json(testCases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch test cases' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const testCase = await testCaseService.updateTestCase(req.params.id, req.body);
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json(testCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update test case' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await testCaseService.deleteTestCase(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Test case not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test case' });
  }
});

export default router;
