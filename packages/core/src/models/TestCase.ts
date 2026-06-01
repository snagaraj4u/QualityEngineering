import { TestCaseModel, Step } from '../adapters/types';

export class TestCase implements TestCaseModel {
  id: string;
  name: string;
  steps: Step[];
  expectedResult: string;

  constructor(id: string, name: string, steps: Step[], expectedResult: string) {
    this.id = id;
    this.name = name;
    this.steps = steps;
    this.expectedResult = expectedResult;
  }

  validate(): boolean {
    if (!this.id || !this.name) return false;
    if (!Array.isArray(this.steps) || this.steps.length === 0) return false;
    if (!this.expectedResult) return false;
    return this.steps.every(step => step.action && step.target);
  }
}
