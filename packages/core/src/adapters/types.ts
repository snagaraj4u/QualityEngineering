export interface TestCaseModel {
  id: string;
  name: string;
  steps: Step[];
  expectedResult: string;
}

export interface Step {
  action: string;
  target: string;
  value?: string;
}

export interface AdapterConfig {
  frameworkName: string;
  projectPath: string;
}

export interface GeneratedCode {
  code: string;
  fileExtension: string;
}
