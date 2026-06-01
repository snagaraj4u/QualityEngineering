import { Command } from 'commander';
import chalk from 'chalk';
import axios from 'axios';

// The CLI is a standalone published package; it talks to the QE backend over
// HTTP rather than importing backend source (which wouldn't ship in the
// package). Base URL mirrors the web app's convention.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const runCommand = new Command()
  .name('run')
  .description('Start a test execution on the QE backend')
  .requiredOption('-f, --framework <framework>', 'Test framework (cucumber|jest|cypress|selenium)')
  .requiredOption('-p, --project <path>', 'Path to the test project on the backend host')
  .requiredOption('--project-id <id>', 'Project ID (for results tracking / multi-tenancy)')
  .requiredOption('-c, --client-id <id>', 'Client ID (for results tracking / multi-tenancy)')
  .option('-t, --test-pattern <pattern>', 'Pattern to match test files')
  .option('--json', 'Output the raw response as JSON')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Starting test execution...'));

      const { data } = await axios.post(`${API_BASE}/api/test/execute`, {
        projectId: options.projectId,
        clientId: options.clientId,
        framework: options.framework,
        projectPath: options.project,
        testPattern: options.testPattern,
      });

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('\n' + chalk.bold('Execution started'));
        console.log(chalk.green(`Execution ID: ${data.executionId}`));
        console.log(chalk.cyan(`Status: ${data.status}`));
        console.log(
          chalk.gray(
            `Track results: GET ${API_BASE}/api/test/${data.executionId}?clientId=${options.clientId}`
          )
        );
      }

      process.exit(0);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : error instanceof Error
          ? error.message
          : String(error);
      console.error(chalk.red('Error starting test execution:'), message);
      process.exit(1);
    }
  });
