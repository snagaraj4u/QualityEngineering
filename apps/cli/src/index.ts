import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('qe')
  .description('Quality Engineering CLI')
  .version('1.0.0');

program
  .command('test')
  .description('Run tests')
  .action(() => {
    console.log(chalk.green('Testing...'));
  });

program.parse(process.argv);
