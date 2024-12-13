#!/usr/bin/env node
import fs from 'fs';
import path, { dirname } from 'path';
import { exec } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import chalk from 'chalk';

function getLibraryPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let currentDir = __dirname;
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
  const packageJsonPath = path.join(currentDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return `node_modules/${packageJson.name}`;
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
let commandBase = `tsx ${getLibraryPath()}/src/index.ts`;

if (args[0] === 'generate') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const postInstallPath = pathToFileURL(path.join(__dirname, 'generate_tests.js'));
  if (fs.existsSync(postInstallPath)) {
    console.log(chalk.yellow('generate folder visual_tests ...'));
    await import(postInstallPath);
  } else {
    console.log(chalk.red('generate_tests.js not found!'));
  }
} else if (args[0] === 'ref') {
  const command = `${commandBase} --command test --ref ${args.slice(1).join(' ')}`;
  console.log(chalk.yellow(`Running command: ${command}`));
  runCommand(command);
} else if (args[0] === 'approve') {
  const command = `${commandBase} --command approve ${args.slice(1).join(' ')}`;
  console.log(chalk.yellow(`Running command: ${command}`));
  runCommand(command);
} else if (args[0] === 'test') {
  const command = `${commandBase} --command test ${args.slice(1).join(' ')}`;
  console.log(chalk.yellow(`Running command: ${command}`));
  runCommand(command);
} else {
  console.log(
    chalk.red("Invalid command. Use one of the following: 'eshn-visual generate' 'eshn-visual ref', 'eshn-visual approve', 'eshn-visual test'.")
  );
}
