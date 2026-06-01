import express, { Router, Request, Response } from 'express';
import { JiraService, JiraConfig } from '../services/JiraService';

const router = Router();

const jiraConfig: JiraConfig = {
  clientId: process.env.JIRA_CLIENT_ID || '',
  clientSecret: process.env.JIRA_CLIENT_SECRET || '',
  redirectUri: process.env.JIRA_REDIRECT_URI || 'http://localhost:3001/api/jira/callback',
  baseUrl: process.env.JIRA_BASE_URL || 'https://api.atlassian.com',
};

const jiraService = new JiraService(jiraConfig);

router.get('/auth/url', (req: Request, res: Response) => {
  try {
    const authUrl = jiraService.getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokenData = await jiraService.exchangeCodeForToken(code);
    res.json(tokenData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

router.get('/requirements', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.query;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const issues = await jiraService.getIssues(accessToken as string);
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

router.get('/requirements/:issueId', async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const { accessToken } = req.query;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const issue = await jiraService.getIssueDetails(accessToken as string, issueId);
    res.json(issue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requirement details' });
  }
});

export default router;
