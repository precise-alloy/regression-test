#!/usr/bin/env node

import chalk from 'chalk';
import { initRegressify } from './initialization/init.js';
import { regressifyProcess } from './regressify.js';
import { exit } from 'process';
import { getVersion } from './initialization/get-version.js';

const args = process.argv.slice(2);
const command = args[0].toLowerCase();

if (command === 'version') {
  getVersion();
} else if (command === 'init') {
  await initRegressify();
} else if (command === 'ref') {
  await regressifyProcess('test', ['--ref', ...args.slice(1)]);
} else if (command === 'approve') {
  await regressifyProcess('approve', args.slice(1));
} else if (command === 'test') {
  await regressifyProcess('test', args.slice(1));
} else {
  console.log(chalk.red("Invalid command. Use one of the following: 'regressify init' 'regressify ref', 'regressify approve', 'regressify test'."));
  exit(1);
}
