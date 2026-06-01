import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  user?: { id: string; email: string };
}

export interface SkillRequest extends AuthRequest {
  skillId?: string;
}

export interface TestCaseResponse {
  id: string;
  name: string;
  description: string;
  expectedResult: string;
  createdAt: Date;
}

export interface ExecutionResultResponse {
  id: string;
  testCaseId: string;
  status: 'passed' | 'failed' | 'error';
  actualResult: string;
  error?: string;
  executedAt: Date;
}
