# Visual Regression Test

Please check [Documentation](https://tuyen.blog/optimizely-cms/testing/get-started/) for the instructions.

## Use

1. Install:

   ```bash
   npm i @eshn/visual-regression-tests
   ```

1. Manual Set up all test and config files in the **visual_tests** folder and place it at the root of the project, or automatically add it using the command:
   ```bash
   npx eshn-visual generate
   ```
1. Add to scripts in package.json:

   ```bash
    "ref": "eshn-visual ref",
    "approve": "eshn-visual approve",
    "test": "eshn-visual test"
   ```

1. Use new command aliases:

   | Command                                             | Alias 1 | Alias 2       | Description         |
   | --------------------------------------------------- | ------- | ------------- | ------------------- |
   | npm run ref -- --test-suite alloy                   | r alloy | ref alloy     |                     |
   | npm run approve -- --test-suite alloy               | a alloy | approve alloy |                     |
   | npm run ref -- --test-suite alloy                   | t alloy | test alloy    |                     |
   | npm run ref -- --test-suite sign-in --requiredLogin | t alloy | test alloy    | Run with login mode |
