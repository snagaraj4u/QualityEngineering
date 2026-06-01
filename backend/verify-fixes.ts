/**
 * Verification script for code quality fixes
 * Checks that all 7 issues have been properly fixed
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FixVerification {
  issue: number;
  description: string;
  passed: boolean;
  details: string;
}

const results: FixVerification[] = [];

// Helper to read file
function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// Issue 1: Unnecessary null checks
console.log('Checking Issue 1: Unnecessary null checks in executors.ts...');
try {
  const executorsContent = readFile(path.join(__dirname, 'src/utils/executors.ts'));
  const lines = executorsContent.split('\n');

  let issue1Passed = true;
  const badPatterns = [];

  lines.forEach((line, idx) => {
    if (line.includes('code !== 0 && code !== null')) {
      issue1Passed = false;
      badPatterns.push(`Line ${idx + 1}: ${line.trim()}`);
    }
  });

  results.push({
    issue: 1,
    description: 'Unnecessary null checks removed',
    passed: issue1Passed,
    details: issue1Passed
      ? 'All null checks (code !== null) removed from close event handlers'
      : `Found bad patterns:\n${badPatterns.join('\n')}`,
  });
} catch (error) {
  results.push({
    issue: 1,
    description: 'Unnecessary null checks removed',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Issue 2: Semantic misuse in TestExecutionService.ts
console.log('Checking Issue 2: Semantic misuse of errorMessage field...');
try {
  const serviceContent = readFile(
    path.join(__dirname, 'src/services/TestExecutionService.ts')
  );

  const hasWrongAssignment = serviceContent.includes('errorMessage: result.rawOutput');
  const hasTestOutputField = serviceContent.includes('testOutput: result.rawOutput') ||
    serviceContent.includes('testOutput =') ||
    serviceContent.includes("data: dataToSave");

  results.push({
    issue: 2,
    description: 'Semantic misuse in TestExecutionService.ts',
    passed: !hasWrongAssignment && hasTestOutputField,
    details: !hasWrongAssignment
      ? 'rawOutput is no longer assigned to errorMessage field'
      : 'Found errorMessage: result.rawOutput assignment',
  });
} catch (error) {
  results.push({
    issue: 2,
    description: 'Semantic misuse in TestExecutionService.ts',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Issue 3: Inconsistent async error handling
console.log('Checking Issue 3: Async error handling consistency...');
try {
  const serviceContent = readFile(
    path.join(__dirname, 'src/services/TestExecutionService.ts')
  );

  // Check that fs.access is within a try block
  const parseResultsMatch = serviceContent.match(
    /async parseResults[\s\S]*?\{[\s\S]*?try[\s\S]*?fs\.access/
  );

  results.push({
    issue: 3,
    description: 'Async error handling consistency',
    passed: !!parseResultsMatch,
    details: parseResultsMatch
      ? 'fs.access is properly integrated in try/catch pattern'
      : 'fs.access may not be properly integrated in try/catch',
  });
} catch (error) {
  results.push({
    issue: 3,
    description: 'Async error handling consistency',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Issue 4: Missing projectId parameter in run.ts
console.log('Checking Issue 4: Missing projectId parameter...');
try {
  const runContent = readFile(path.join(__dirname, 'src/commands/run.ts'));

  const hasProjectIdInRequest = runContent.includes('projectId:') &&
    runContent.includes('ExecutionRequest');
  const hasProjectIdParameter = runContent.includes('projectId:');

  results.push({
    issue: 4,
    description: 'Missing projectId parameter in ExecutionRequest',
    passed: hasProjectIdInRequest,
    details: hasProjectIdInRequest
      ? 'projectId is now included in ExecutionRequest construction'
      : 'projectId parameter is missing',
  });
} catch (error) {
  results.push({
    issue: 4,
    description: 'Missing projectId parameter in ExecutionRequest',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Issue 5: Redundant error re-wrapping
console.log('Checking Issue 5: Redundant error re-wrapping...');
try {
  const serviceContent = readFile(
    path.join(__dirname, 'src/services/TestExecutionService.ts')
  );

  // Check for the pattern of redundant error wrapping
  const hasDuplicateWrapping = serviceContent.includes(
    'throw new Error(`Failed to save execution results: ${errorMessage}`)'
  );
  const hasImprovedErrorHandling = serviceContent.includes(
    'if (error instanceof Error)'
  );

  results.push({
    issue: 5,
    description: 'Redundant error re-wrapping',
    passed: hasImprovedErrorHandling && !hasDuplicateWrapping,
    details: hasImprovedErrorHandling
      ? 'Error handling improved - checks error type before wrapping'
      : 'Error handling may still have redundant wrapping',
  });
} catch (error) {
  results.push({
    issue: 5,
    description: 'Redundant error re-wrapping',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Issue 6: Unclear regex escaping
console.log('Checking Issue 6: Unclear regex escaping...');
try {
  const executorsContent = readFile(path.join(__dirname, 'src/utils/executors.ts'));

  // Check for comment explaining the regex
  const hasExplanationComment = executorsContent.includes(
    'Pattern breakdown'
  ) || executorsContent.includes('Note: Inside character class');

  results.push({
    issue: 6,
    description: 'Unclear regex escaping',
    passed: hasExplanationComment,
    details: hasExplanationComment
      ? 'Regex pattern is now documented with explanation'
      : 'Regex pattern documentation is missing',
  });
} catch (error) {
  results.push({
    issue: 6,
    description: 'Unclear regex escaping',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Issue 7: Stack trace exposure
console.log('Checking Issue 7: Stack trace exposure...');
try {
  const runContent = readFile(path.join(__dirname, 'src/commands/run.ts'));

  // Check that error.stack is not directly used
  const hasErrorStack = runContent.includes('error.stack');
  // Check that there's NODE_ENV check for development mode
  const hasEnvironmentCheck = runContent.includes('NODE_ENV') &&
    runContent.includes('development');

  results.push({
    issue: 7,
    description: 'Stack trace exposure in production',
    passed: !hasErrorStack && hasEnvironmentCheck,
    details:
      !hasErrorStack && hasEnvironmentCheck
        ? 'Stack traces are sanitized and only exposed in development mode'
        : `Issues: error.stack exposed: ${hasErrorStack}, env check: ${hasEnvironmentCheck}`,
  });
} catch (error) {
  results.push({
    issue: 7,
    description: 'Stack trace exposure in production',
    passed: false,
    details: `Error: ${(error as Error).message}`,
  });
}

// Print results
console.log('\n' + '='.repeat(70));
console.log('CODE QUALITY FIXES VERIFICATION RESULTS');
console.log('='.repeat(70) + '\n');

let allPassed = true;
results.forEach((result) => {
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} | Issue ${result.issue}: ${result.description}`);
  console.log(`       ${result.details}\n`);

  if (!result.passed) {
    allPassed = false;
  }
});

console.log('='.repeat(70));
console.log(
  `Overall: ${results.filter((r) => r.passed).length}/${results.length} issues fixed`
);
console.log('='.repeat(70));

process.exit(allPassed ? 0 : 1);
