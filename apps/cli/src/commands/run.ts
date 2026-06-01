import { Command } from 'commander';
import { TestExecutionService } from '../../../backend/src/services/TestExecutionService';
import chalk from 'chalk';

const service = new TestExecutionService();

export const runCommand = new Command()
  .name('run')
  .description('Execute tests in a project')
  .requiredOption('-f, --framework <framework>', 'Test framework (cucumber|jest|cypress|selenium)')
  .requiredOption('-p, --project <path>', 'Path to test project')
  .option('-t, --test-pattern <pattern>', 'Pattern to match test files')
  .option('-c, --client-id <id>', 'Client ID for results tracking')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Starting test execution...'));

      const result = await service.executeTests({
        projectPath: options.project,
        framework: options.framework,
        testPattern: options.testPattern,
        clientId: options.clientId,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\n' + chalk.bold('Test Results'));
        console.log(chalk.green(`Passed: ${result.passed}`));
        console.log(chalk.red(`Failed: ${result.failed}`));
        console.log(chalk.yellow(`Skipped: ${result.skipped}`));
        console.log(chalk.cyan(`Duration: ${result.duration}ms`));

        if (result.failed > 0) {
          console.log('\n' + chalk.red.bold('Failed Tests:'));
          result.tests
            .filter((t) => t.status === 'FAILED')
            .forEach((t) => {
              console.log(chalk.red(`  ${t.name}`));
              if (t.errorMessage) {
                console.log(chalk.gray(`    ${t.errorMessage}`));
              }
            });
        }
      }

      process.exit(result.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Error executing tests:'), error);
      process.exit(1);
    }
  });
