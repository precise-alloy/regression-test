# Precise Alloy - Regression Test - Demo

Please check [Documentation](https://tuyen.blog/optimizely-cms/testing/get-started/) for the instructions.

## Get latest features and bug fixes for the tool

1. Add a remote to base test framework (only need to run one time):

   ```bash
   git remote add hn https://github.com/precise-alloy/regression-test.git
   ```

1. Periodically, get latest test frame work features and bug fixes by running the below command:

   ```bash
   git fetch hn
   git merge hn/master
   ```

1. Commit/Push the changes to the project's repository.

## Compare between old and new environment

1. Run below command:

   ```powershell
   $env:REPLACEMENT_PROFILE = 'default'
   ```

1. Execute your test suites as usual.  
   The tests now run on old env with `ref` command and new env with `test` command`.

1. When your tasks are finished, either close the terminal or run below command to reset the profile:

   ```powershell
   $env:REPLACEMENT_PROFILE = ''
   ```

## Use command aliases

1. Run the following command:

   ```powershell
   . ./alias.ps1
   ```

1. Use new command aliases:

   | Command                               | Alias 1 | Alias 2       |
   | ------------------------------------- | ------- | ------------- |
   | npm run ref -- --test-suite alloy     | r alloy | ref alloy     |
   | npm run approve -- --test-suite alloy | a alloy | approve alloy |
   | npm run ref -- --test-suite alloy     | t alloy | test alloy    |
