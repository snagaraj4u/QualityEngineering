import { TestCaseModel, AdapterConfig, GeneratedCode } from './types';

export abstract class BaseAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract generateCode(testCase: TestCaseModel): GeneratedCode;

  abstract getFileExtension(): string;

  abstract getFrameworkName(): string;

  abstract validateSyntax(code: string): boolean;

  getProjectPath(): string {
    return this.config.projectPath;
  }

  getFramework(): string {
    return this.config.frameworkName;
  }
}
