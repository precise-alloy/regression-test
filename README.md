# Visual Regression Test

Please check [Documentation](https://tuyen.blog/optimizely-cms/testing/get-started/) for the instructions.

## Use

1. Install:

   ```bash
   npm i -g regressify
   ```

1. Manual Set up all test and config files in the **visual_tests** folder and place it at the root of the project, or automatically add it using the command:

   ```bash
   regressify init
   ```

1. Add to scripts in package.json:

   ```bash
    "ref": "regressify ref",
    "approve": "regressify approve",
    "test": "regressify test"
   ```

