import { Command } from 'commander';
import { runCommand } from './commands/run';

const program = new Command();

program
  .name('qe')
  .description('Quality Engineering CLI')
  .version('1.0.0');

program.addCommand(runCommand);

program.parse(process.argv);
