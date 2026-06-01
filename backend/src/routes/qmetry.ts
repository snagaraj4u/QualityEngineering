import express, { Router, Request, Response } from 'express';
import { QMetryService, QMetryConfig } from '../services/QMetryService';

const router = Router();

const qmetryConfig: QMetryConfig = {
  apiKey: process.env.QMETRY_API_KEY || '',
  apiSecret: process.env.QMETRY_API_SECRET || '',
  baseUrl: process.env.QMETRY_BASE_URL || 'https://api.qmetry.com',
};

const qmetryService = new QMetryService(qmetryConfig);

router.get('/config', (req: Request, res: Response) => {
  try {
    res.json({ config: qmetryConfig });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config' });
  }
});

router.post('/config', (req: Request, res: Response) => {
  try {
    const { apiKey, apiSecret, baseUrl } = req.body;
    Object.assign(qmetryConfig, { apiKey, apiSecret, baseUrl });
    res.json({ message: 'Config updated', config: qmetryConfig });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

router.post('/defects', async (req: Request, res: Response) => {
  try {
    const defect = req.body;
    const result = await qmetryService.createDefect(defect);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create defect' });
  }
});

router.get('/defects', async (req: Request, res: Response) => {
  try {
    const defects = await qmetryService.listDefects();
    res.json(defects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list defects' });
  }
});

router.get('/defects/:defectId', async (req: Request, res: Response) => {
  try {
    const { defectId } = req.params;
    const defect = await qmetryService.getDefect(defectId);
    res.json(defect);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch defect' });
  }
});

export default router;
