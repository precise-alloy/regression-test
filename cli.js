#!/usr/bin/env node
import fs from 'fs';
import path, { dirname } from 'path';
import { exec } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import chalk from 'chalk';

function getLibraryPath() {
  const fileName = fileURLToPath(import.meta.url);
  let currentDir = dirname(fileName);

  while (true) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      // We have found the package.json file
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (
        (packageJson.dependencies && packageJson.dependencies['regressify']) ||
        (packageJson.devDependencies && packageJson.devDependencies['regressify'])
      ) {
        return `node_modules/${packageJson.name}`;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We have reached the root directory
      console.log(chalk.red('Could not find package.json file in the current directory or any of its parents. Current directory:'), import.meta.url);
      console.log(chalk.red('___filename:'), __filename);
      console.log(chalk.red('__dirname:'), __dirname);
      return null;
    }

    currentDir = parentDir;
  }
}

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

let commandBase = `tsx ${getLibraryPath()}/src/index.ts`;

if (command === 'init') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const postInstallPath = pathToFileURL(path.join(__dirname, 'generate_tests.js'));
  if (fs.existsSync(postInstallPath)) {
    console.log(chalk.yellow('Generate folder visual_tests ...'));
    await import(postInstallPath);
  } else {
    console.log(chalk.red('generate_tests.js not found!'));
  }

  const updatePackageJsonPath = pathToFileURL(path.join(__dirname, 'update-package.js'));
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
