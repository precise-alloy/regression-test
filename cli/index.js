#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { pathToFileURL } from 'url';
import chalk from 'chalk';
import { getLibraryPath } from './helpers';
import slash from 'slash';

const libraryPath = getLibraryPath();

function runCommand(command) {
  const childProcess = exec(command, { env: { ...process.env, FORCE_COLOR: '1' } });

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

const args = process.argv.slice(2);
const command = args[0].toLowerCase();

let commandBase = `node ${libraryPath}/src/index.js`;

if (command === 'init') {
  const postInstallPath = slash(pathToFileURL(path.join(libraryPath, 'cli', 'generate-tests.js')));
  if (fs.existsSync(postInstallPath)) {
    console.log(chalk.yellow('Generate folder visual_tests ...'));
    await import(postInstallPath);
  } else {
    console.log(chalk.red('generate-tests.js not found!'));
  }

  const updatePackageJsonPath = slash(pathToFileURL(path.join(libraryPath, 'cli', 'update-package.js')));
  if (fs.existsSync(updatePackageJsonPath)) {
    console.log(chalk.yellow('Update package.json ...'));
    await import(updatePackageJsonPath);
  } else {
    console.log(chalk.red('update-package.js not found!'));
  }
} else if (command === 'ref') {
  const command = `${commandBase} --command test --ref ${args.slice(1).join(' ')}`;
  console.log(chalk.yellow(`Running command: ${command}`));
  runCommand(command);
} else if (command === 'approve') {
  const command = `${commandBase} --command approve ${args.slice(1).join(' ')}`;
  console.log(chalk.yellow(`Running command: ${command}`));
  runCommand(command);
} else if (command === 'test') {
  const command = `${commandBase} --command test ${args.slice(1).join(' ')}`;
  console.log(chalk.yellow(`Running command: ${command}`));
  runCommand(command);
} else {
  console.log(chalk.red("Invalid command. Use one of the following: 'regressify init' 'regressify ref', 'regressify approve', 'regressify test'."));
}
