import { TestCaseModel, AdapterConfig, GeneratedCode } from './types';
import { BaseAdapter } from './BaseAdapter';
import * as fs from 'fs';
import * as path from 'path';

export class CucumberAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  generateCode(testCase: TestCaseModel): GeneratedCode {
    const featureCode = this.generateFeatureFile(testCase);
    return {
      code: featureCode,
      fileExtension: this.getFileExtension(),
    };
  }

  getFileExtension(): string {
    return '.feature';
  }

  getFrameworkName(): string {
    return 'Cucumber';
  }

  validateSyntax(code: string): boolean {
    const featureKeywordRegex = /^Feature:/m;
    const scenarioKeywordRegex = /^\s*Scenario:/m;
    const givenWhenThenRegex = /^\s*(Given|When|Then|And|But)\s+/m;

    return (
      featureKeywordRegex.test(code) &&
      scenarioKeywordRegex.test(code) &&
      givenWhenThenRegex.test(code)
    );
  }

  writeToProject(testCase: TestCaseModel): void {
    const generatedCode = this.generateCode(testCase);
    const fileName = this.sanitizeFileName(testCase.name);
    const filePath = path.join(
      this.getProjectPath(),
      'features',
      `${fileName}${generatedCode.fileExtension}`
    );

    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, generatedCode.code, 'utf-8');
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '');
  }

  private generateFeatureFile(testCase: TestCaseModel): string {
    const scenarioSteps = testCase.steps
      .map((step) => `    ${step.action} ${step.target}${step.value ? ' ' + step.value : ''}`)
      .join('\n');

    return `Feature: ${testCase.name}

  Scenario: ${testCase.name}
${scenarioSteps}
    Then ${testCase.expectedResult}
`;
  }
}
