import { Command } from 'commander';
import { TestExecutionService } from '../../../backend/src/services/TestExecutionService';
import { logger } from '../../../backend/src/utils/logger';

export const createRunCommand = (): Command => {
  const cmd = new Command('run');

  cmd
    .description('Execute tests via CLI and capture results')
    .requiredOption('--framework <type>', 'Test framework (cucumber, jest, cypress, selenium)')
    .requiredOption('--project <path>', 'Project path to run tests in')
    .option('--test-pattern <pattern>', 'Test file pattern to match')
    .option('--client-id <id>', 'Client ID for result storage')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      try {
        const service = new TestExecutionService();

        const result = await service.executeTests({
          projectPath: options.project,
          framework: options.framework,
          testPattern: options.testPattern,
          clientId: options.clientId,
        });

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // Colored console output
          console.log('\n========== Test Execution Results ==========');
          console.log(`Passed:  \x1b[32m${result.passed}\x1b[0m`);
          console.log(`Failed:  \x1b[31m${result.failed}\x1b[0m`);
          console.log(`Skipped: \x1b[33m${result.skipped}\x1b[0m`);
          console.log(`Duration: ${result.duration}ms`);

          if (result.failed > 0) {
            console.log('\n========== Failed Tests ==========');
            for (const test of result.tests) {
              if (test.status === 'FAILED') {
                console.log(`\x1b[31m✗\x1b[0m ${test.name}`);
                if (test.errorMessage) {
                  console.log(`  Error: ${test.errorMessage}`);
                }
              }
            }
          }

          console.log('==========================================\n');
        }

        // Exit with proper code
        process.exit(result.failed > 0 ? 1 : 0);
      } catch (error) {
        logger.error(`Test execution command failed: ${(error as Error).message}`);
        console.error(`\x1b[31mError: ${(error as Error).message}\x1b[0m`);
        process.exit(1);
      }
    });

  return cmd;
};
