import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from './logger';

// Validation function for test patterns to prevent shell injection
function validateTestPattern(pattern: string): void {
  // Only allow alphanumeric, dots, slashes, hyphens, underscores, asterisks, question marks, and brackets
  // Note: Inside character class [], {} doesn't need escaping but is included for clarity
  // Pattern breakdown: letters/digits (a-z, A-Z, 0-9), underscore (_), hyphen (\-), dot (.),
  // forward slash (/), curly braces ({}), asterisk (*), question mark (?), and brackets ([\])
  const allowedPatternRegex = /^[a-zA-Z0-9_\-./{}*?[\]]+$/;
  if (!allowedPatternRegex.test(pattern)) {
    throw new Error(
      `Invalid test pattern: contains dangerous characters. ` +
      `Only alphanumeric, dots, slashes, hyphens, underscores, wildcards, and brackets are allowed.`
    );
  }
}

// TypeScript interfaces for framework report formats
interface CucumberStep {
  result?: {
    status: string;
    duration?: number;
    error_message?: string;
  };
}

interface CucumberScenario {
  name?: string;
  steps?: CucumberStep[];
}

interface CucumberFeature {
  elements?: CucumberScenario[];
}

interface JestAssertionResult {
  status: string;
  fullName?: string;
  title?: string;
  duration?: number;
  failureMessages?: string[];
}

interface JestTestFile {
  assertionResults?: JestAssertionResult[];
}

interface JestReport {
  testResults?: JestTestFile[];
}

interface CypressTest {
  title?: string;
  pass?: boolean;
  pending?: boolean;
  duration?: number;
  err?: {
    message?: string;
  };
}

interface CypressSuite {
  tests?: CypressTest[];
  suites?: CypressSuite[];
}

interface CypressReport {
  suites?: CypressSuite[];
}

interface SeleniumTest {
  title?: string;
  pass?: boolean;
  pending?: boolean;
  duration?: number;
  err?: {
    message?: string;
  };
}

interface SeleniumReport {
  tests?: SeleniumTest[];
}

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
    // Validate test pattern to prevent shell injection
    if (testPattern) {
      try {
        validateTestPattern(testPattern);
      } catch (error) {
        reject(error);
        return;
      }
    }

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
        // Validate exit code - non-zero means failure
        // Note: Node.js close events never pass null for code
        if (code !== 0) {
          throw new Error(`Cucumber execution failed with exit code ${code}`);
        }

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
    // Validate test pattern to prevent shell injection
    if (testPattern) {
      try {
        validateTestPattern(testPattern);
      } catch (error) {
        reject(error);
        return;
      }
    }

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
        // Validate exit code - non-zero means failure
        // Note: Node.js close events never pass null for code
        if (code !== 0) {
          throw new Error(`Jest execution failed with exit code ${code}`);
        }

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
    // Validate test pattern to prevent shell injection
    if (testPattern) {
      try {
        validateTestPattern(testPattern);
      } catch (error) {
        reject(error);
        return;
      }
    }

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
        // Validate exit code - non-zero means failure
        // Note: Node.js close events never pass null for code
        if (code !== 0) {
          throw new Error(`Cypress execution failed with exit code ${code}`);
        }

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
    // Validate test pattern to prevent shell injection
    if (testPattern) {
      try {
        validateTestPattern(testPattern);
      } catch (error) {
        reject(error);
        return;
      }
    }

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
        // Validate exit code - non-zero means failure
        // Note: Node.js close events never pass null for code
        if (code !== 0) {
          throw new Error(`Selenium execution failed with exit code ${code}`);
        }

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
    let features: CucumberFeature[];

    try {
      features = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse Cucumber report JSON: ${(parseError as Error).message}`);
    }

    // Validate that features is an array
    if (!Array.isArray(features)) {
      throw new Error('Invalid Cucumber report format: expected array of features');
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    for (const feature of features) {
      // Validate feature structure
      if (!feature || typeof feature !== 'object') continue;

      const elements = feature.elements;
      if (Array.isArray(elements)) {
        for (const scenario of elements) {
          // Validate scenario structure
          if (!scenario || typeof scenario !== 'object') continue;

          let scenarioStatus: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
          let scenarioDuration = 0;

          const steps = scenario.steps;
          if (Array.isArray(steps)) {
            for (const step of steps) {
              if (step && step.result && typeof step.result === 'object') {
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

          const errorStep = Array.isArray(steps)
            ? steps.find((s: CucumberStep) => s && s.result && s.result.error_message)
            : undefined;

          tests.push({
            name: scenario.name || 'Unnamed Scenario',
            status: scenarioStatus,
            duration: scenarioDuration,
            errorMessage: errorStep?.result?.error_message,
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
    let data: JestReport;

    try {
      data = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse Jest report JSON: ${(parseError as Error).message}`);
    }

    // Validate that data is an object
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Jest report format: expected object');
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    const testResults = data.testResults;
    if (Array.isArray(testResults)) {
      for (const testFile of testResults) {
        if (!testFile || typeof testFile !== 'object') continue;

        const assertionResults = testFile.assertionResults;
        if (Array.isArray(assertionResults)) {
          for (const assertion of assertionResults) {
            if (!assertion || typeof assertion !== 'object') continue;

            const status =
              assertion.status === 'passed'
                ? 'PASSED'
                : assertion.status === 'pending'
                  ? 'SKIPPED'
                  : 'FAILED';

            if (status === 'PASSED') passed++;
            else if (status === 'FAILED') failed++;
            else if (status === 'SKIPPED') skipped++;

            const duration = assertion.duration || 0;
            totalDuration += duration;

            tests.push({
              name: assertion.fullName || assertion.title || 'Unnamed Test',
              status,
              duration,
              errorMessage: Array.isArray(assertion.failureMessages)
                ? assertion.failureMessages[0]
                : undefined,
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
    let data: CypressReport;

    try {
      data = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse Cypress report JSON: ${(parseError as Error).message}`);
    }

    // Validate that data is an object
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Cypress report format: expected object');
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    const extractTests = (suite: CypressSuite): void => {
      if (!suite || typeof suite !== 'object') return;

      const suiteTests = suite.tests;
      if (Array.isArray(suiteTests)) {
        for (const test of suiteTests) {
          if (!test || typeof test !== 'object') continue;

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

      const suites = suite.suites;
      if (Array.isArray(suites)) {
        for (const subsuite of suites) {
          extractTests(subsuite);
        }
      }
    };

    const suites = data.suites;
    if (Array.isArray(suites)) {
      for (const suite of suites) {
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
    let data: SeleniumReport;

    try {
      data = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse Selenium report JSON: ${(parseError as Error).message}`);
    }

    // Validate that data is an object
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Selenium report format: expected object');
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDuration = 0;
    const tests: TestResult[] = [];

    const seleniumTests = data.tests;
    if (Array.isArray(seleniumTests)) {
      for (const test of seleniumTests) {
        if (!test || typeof test !== 'object') continue;

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
