#!/usr/bin/env node

import { exec } from 'child_process';
import chalk from 'chalk';
import { getLibraryPath } from './helpers.js';
import { initRegressify } from './initialization/init.js';
import { regressifyProcess } from './regressify.js';
import { exit } from 'process';

const libraryPath = getLibraryPath();

function runCommand(command: string) {
  const childProcess = exec(command, { env: { ...process.env, FORCE_COLOR: '1' } });

  if (childProcess) {
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    }

    childProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(chalk.red(`Command exited with code ${code}`));
      }
    });
  }

  childProcess.on('error', (err) => {
    console.log(chalk.red(`Failed to start command: ${err.message}`));
  });
}

const args = process.argv.slice(2);
const command = args[0].toLowerCase();

if (command === 'init') {
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
