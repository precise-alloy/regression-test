import chalk from 'chalk';
import backstop from "backstopjs";
import config from './config.js';
import { getStringArg } from "./helpers.js";

const command = getStringArg('--command') as 'approve' | 'init' | 'reference' | 'test' | undefined;
if (!command) {
  throw "`command` must be set";
}

console.log('test');

backstop(command, { config })
  .then(() => {
    console.log(chalk.green(command.toUpperCase() + ' FINISHED SUCCESSFULLY'));
  }).catch(() => {
    console.log(chalk.red(command.toUpperCase() + ' FAILED'));
  });
