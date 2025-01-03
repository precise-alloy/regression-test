#!/usr/bin/env node
import { exec } from 'child_process';
import chalk from 'chalk';

export function runCommand(command) {
  const childProcess = exec(command, { env: { ...process.env, FORCE_COLOR: '1' } });

  if (!childProcess) {
    console.log(chalk.red('Failed to start command'));
    return;
  }

  if (!childProcess.stdout) {
    console.log(chalk.red('Failed to get stdout'));
    return;
  }

  if (!childProcess.stderr) {
    console.log(chalk.red('Failed to get stderr'));
    return;
  }

  childProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  childProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  childProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`Command exited with code ${code}`));
    }
  });

  childProcess.on('error', (err) => {
    console.log(chalk.red(`Failed to start command: ${err.message}`));
  });
}
