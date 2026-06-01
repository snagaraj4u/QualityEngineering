import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';

export interface ExecutionOptions {
  projectPath: string;
  framework: 'cucumber' | 'jest' | 'cypress' | 'selenium';
  testPattern?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

export interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: number;
  errorMessage?: string;
}

export interface ExecutionResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
  rawOutput?: string;
}

export interface ExecutionRequest {
  projectPath: string;
  framework: 'cucumber' | 'jest' | 'cypress' | 'selenium';
  testPattern?: string;
  clientId?: string;
  projectId?: string;
}

export async function executeTests(options: ExecutionOptions): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { projectPath, framework, testPattern, environment, timeout } = options;

  // Validate project path exists
  try {
    await fs.access(projectPath);
  } catch {
    throw new Error(`Project path not found: ${projectPath}`);
  }

  let result: ExecutionResult;

  switch (framework) {
    case 'cucumber':
      result = await executeCucumber(projectPath, testPattern, environment, timeout);
      break;
    case 'jest':
      result = await executeJest(projectPath, testPattern, environment, timeout);
      break;
    case 'cypress':
      result = await executeCypress(projectPath, testPattern, environment, timeout);
      break;
    case 'selenium':
      result = await executeSelenium(projectPath, testPattern, environment, timeout);
      break;
    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function executeCucumber(
  projectPath: string,
  testPattern?: string,
  environment?: Record<string, string>,
  timeout?: number
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const reportPath = path.join(projectPath, 'cucumber-report.json');
    const args = [
      'cucumber-js',
      ...(testPattern ? [testPattern] : []),
      '--format',
      `json:${reportPath}`,
    ];

    const child = spawn('npx', args, {
      cwd: projectPath,
      env: { ...process.env, ...environment },
      timeout: timeout || 60000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      logger.error(`Cucumber execution error: ${error.message}`);
      reject(error);
    });

    child.on('close', async (code) => {
      try {
        // Parse the generated JSON report
        const result = await parseCucumberReport(reportPath);
        result.rawOutput = stdout + stderr;
        resolve(result);
      } catch (error) {
        logger.error(`Failed to parse Cucumber report: ${(error as Error).message}`);
        reject(error);
      }
    });
  });
}

async function executeJest(
  projectPath: string,
  testPattern?: string,
  environment?: Record<string, string>,
  timeout?: number
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const reportPath = path.join(projectPath, 'jest-report.json');
    const args = [
      'jest',
      ...(testPattern ? ['--testPathPattern', testPattern] : []),
      '--json',
      `--outputFile=${reportPath}`,
    ];

    const child = spawn('npx', args, {
      cwd: projectPath,
      env: { ...process.env, ...environment },
      timeout: timeout || 60000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      logger.error(`Jest execution error: ${error.message}`);
      reject(error);
    });

    child.on('close', async (code) => {
      try {
        const result = await parseJestReport(reportPath);
        result.rawOutput = stdout + stderr;
        resolve(result);
      } catch (error) {
        logger.error(`Failed to parse Jest report: ${(error as Error).message}`);
        reject(error);
      }
    });
  });
}

async function executeCypress(
  projectPath: string,
  testPattern?: string,
  environment?: Record<string, string>,
  timeout?: number
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const reportPath = path.join(projectPath, 'cypress-report.json');
    const args = [
      'cypress',
      'run',
      ...(testPattern ? ['--spec', testPattern] : []),
      '--reporter',
      'json',
      '--reporter-options',
      `mochaFile=${reportPath}`,
    ];

    const child = spawn('npx', args, {
      cwd: projectPath,
      env: { ...process.env, ...environment },
      timeout: timeout || 60000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      logger.error(`Cypress execution error: ${error.message}`);
      reject(error);
    });

    child.on('close', async (code) => {
      try {
        const result = await parseCypressReport(reportPath);
        result.rawOutput = stdout + stderr;
        resolve(result);
      } catch (error) {
        logger.error(`Failed to parse Cypress report: ${(error as Error).message}`);
        reject(error);
      }
    });
  });
}

async function executeSelenium(
  projectPath: string,
  testPattern?: string,
  environment?: Record<string, string>,
  timeout?: number
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const reportPath = path.join(projectPath, 'selenium-report.json');
    const args = [
      'mocha',
      ...(testPattern ? [testPattern] : ['test/**/*.test.js']),
      '--reporter',
      'json',
      `--reporter-options=mochaFile=${reportPath}`,
    ];

    const child = spawn('npx', args, {
      cwd: projectPath,
      env: { ...process.env, ...environment },
      timeout: timeout || 60000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      logger.error(`Selenium execution error: ${error.message}`);
      reject(error);
    });

    child.on('close', async (code) => {
      try {
        const result = await parseSeleniumReport(reportPath);
        result.rawOutput = stdout + stderr;
        resolve(result);
      } catch (error) {
        logger.error(`Failed to parse Selenium report: ${(error as Error).message}`);
        reject(error);
      }
    });
  });
}

async function parseCucumberReport(reportPath: string): Promise<ExecutionResult> {
  try {
    const content = await fs.readFile(reportPath, 'utf-8');
    const features = JSON.parse(content);

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    for (const feature of features) {
      if (feature.elements) {
        for (const scenario of feature.elements) {
          let scenarioStatus: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
          let scenarioDuration = 0;

          if (scenario.steps) {
            for (const step of scenario.steps) {
              if (step.result) {
                scenarioDuration += step.result.duration || 0;

                if (step.result.status === 'failed') {
                  scenarioStatus = 'FAILED';
                } else if (step.result.status === 'skipped' && scenarioStatus === 'PASSED') {
                  scenarioStatus = 'SKIPPED';
                }
              }
            }
          }

          if (scenarioStatus === 'PASSED') passed++;
          else if (scenarioStatus === 'FAILED') failed++;
          else if (scenarioStatus === 'SKIPPED') skipped++;

          totalDuration += scenarioDuration;

          tests.push({
            name: scenario.name || 'Unnamed Scenario',
            status: scenarioStatus,
            duration: scenarioDuration,
            errorMessage: scenario.steps?.find((s: any) => s.result?.error_message)?.result?.error_message,
          });
        }
      }
    }

    return {
      passed,
      failed,
      skipped,
      duration: totalDuration,
      tests,
    };
  } catch (error) {
    logger.error(`Error parsing Cucumber report: ${(error as Error).message}`);
    throw error;
  }
}

async function parseJestReport(reportPath: string): Promise<ExecutionResult> {
  try {
    const content = await fs.readFile(reportPath, 'utf-8');
    const data = JSON.parse(content);

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    if (data.testResults) {
      for (const testFile of data.testResults) {
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            const status = assertion.status === 'passed' ? 'PASSED' : assertion.status === 'pending' ? 'SKIPPED' : 'FAILED';

            if (status === 'PASSED') passed++;
            else if (status === 'FAILED') failed++;
            else if (status === 'SKIPPED') skipped++;

            const duration = assertion.duration || 0;
            totalDuration += duration;

            tests.push({
              name: assertion.fullName || assertion.title || 'Unnamed Test',
              status,
              duration,
              errorMessage: assertion.failureMessages?.[0],
            });
          }
        }
      }
    }

    return {
      passed,
      failed,
      skipped,
      duration: totalDuration,
      tests,
    };
  } catch (error) {
    logger.error(`Error parsing Jest report: ${(error as Error).message}`);
    throw error;
  }
}

async function parseCypressReport(reportPath: string): Promise<ExecutionResult> {
  try {
    const content = await fs.readFile(reportPath, 'utf-8');
    const data = JSON.parse(content);

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    const extractTests = (suite: any): void => {
      if (suite.tests) {
        for (const test of suite.tests) {
          const status = test.pass ? 'PASSED' : test.pending ? 'SKIPPED' : 'FAILED';

          if (status === 'PASSED') passed++;
          else if (status === 'FAILED') failed++;
          else if (status === 'SKIPPED') skipped++;

          const duration = test.duration || 0;
          totalDuration += duration;

          tests.push({
            name: test.title || 'Unnamed Test',
            status,
            duration,
            errorMessage: test.err?.message,
          });
        }
      }

      if (suite.suites) {
        for (const subsuite of suite.suites) {
          extractTests(subsuite);
        }
      }
    };

    if (data.suites) {
      for (const suite of data.suites) {
        extractTests(suite);
      }
    }

    return {
      passed,
      failed,
      skipped,
      duration: totalDuration,
      tests,
    };
  } catch (error) {
    logger.error(`Error parsing Cypress report: ${(error as Error).message}`);
    throw error;
  }
}

async function parseSeleniumReport(reportPath: string): Promise<ExecutionResult> {
  try {
    const content = await fs.readFile(reportPath, 'utf-8');
    const data = JSON.parse(content);

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    if (data.tests) {
      for (const test of data.tests) {
        const status = test.pass ? 'PASSED' : test.pending ? 'SKIPPED' : 'FAILED';

        if (status === 'PASSED') passed++;
        else if (status === 'FAILED') failed++;
        else if (status === 'SKIPPED') skipped++;

        const duration = test.duration || 0;
        totalDuration += duration;

        tests.push({
          name: test.title || 'Unnamed Test',
          status,
          duration,
          errorMessage: test.err?.message,
        });
      }
    }

    return {
      passed,
      failed,
      skipped,
      duration: totalDuration,
      tests,
    };
  } catch (error) {
    logger.error(`Error parsing Selenium report: ${(error as Error).message}`);
    throw error;
  }
}

export { parseCucumberReport, parseJestReport, parseCypressReport, parseSeleniumReport };
