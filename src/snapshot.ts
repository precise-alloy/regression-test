import path from 'path';
import fs from 'fs';
import { Config } from 'backstopjs';
import chalk from 'chalk';
import { BackstopReport, HtmlReportSummary } from './types';

async function processTestSuite(backstopDir: string, config: Config) {
  const testDir = path.join(backstopDir, config.id);
  if (!fs.existsSync(testDir)) {
    console.log(chalk.red(`Test directory does not exist: ${testDir}`));
    return;
  }

  const htmlReportDir = path.join(testDir, 'html_report');
  const bitmapTestDir = path.join(testDir, 'bitmaps_test');

  if (!fs.existsSync(htmlReportDir)) {
    return;
  }

  const configPath = path.join(htmlReportDir, 'config.js');

  if (!fs.existsSync(configPath)) {
    return;
  }

  const configText = fs.readFileSync(configPath, 'utf-8');

  const subDirs = fs
    .readdirSync(bitmapTestDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const htmlReportSummary: HtmlReportSummary[] = [];

  subDirs.forEach((subDir) => {
    const subDirFullPath = path.join(bitmapTestDir, subDir);

    if (!configText.includes(`bitmaps_test/${subDir}`) && !configText.includes(`bitmaps_test\\\\${subDir}`)) {
      // Remove unreferenced snapshot directory
      fs.rmSync(subDirFullPath, { recursive: true, force: true });
      console.log(chalk.yellow(`Removed unreferenced snapshot directory: ${subDirFullPath}`));
    } else {
      // console.log(chalk.green(`Snapshot directory is referenced: ${subDir}`));
      const reportJsonPath = path.join(subDirFullPath, 'report.json');
      if (fs.existsSync(reportJsonPath)) {
        const reportText = fs.readFileSync(reportJsonPath, 'utf-8');
        const report = JSON.parse(reportText) as BackstopReport;
        const passCount = report?.tests?.filter((t) => t.status === 'pass').length ?? 0;
        const failCount = report?.tests?.filter((t) => t.status === 'fail').length ?? 0;
        htmlReportSummary.push({
          id: report.id,
          totalTests: report.tests.length,
          totalPassed: passCount,
          totalFailed: failCount,
        });
        console.log(chalk.green(`Snapshot directory: ${subDir}, Passed: ${passCount}, Failed: ${failCount}`));
      }
    }
  });

  generateHtmlReportSummary(backstopDir, htmlReportSummary);
}

const generateHtmlReportSummary = (backstopDir: string, summaries: HtmlReportSummary[]) => {
  const htmlTemplate = `<html>
  <head>
    <title>Snapshot Report Summary</title>
    <style>
      body {
        margin: 0;
        padding: 40px 24px;
        font-family: Arial, sans-serif;
      }

      h1 {
        margin: 40px 0 60px;
        text-align: center;
      }

      table {
        margin: 0 auto;
        max-width: 800px;
        border-collapse: collapse;
        border: 2px solid #888;
      }

      th,
      td {
        text-align: center;
        padding: 12px 16px;
        border: 1px solid #aaa;
      }

      th {
        background-color: #f2f2f2;
      }

      .success {
        color: green;
        background-color: #d4edda;
        font-weight: bold;
      }

      .danger {
        color: red;
        background-color: #f8d7da;
        font-weight: bold;
      }
    </style>
  </head>

  <body>
    <h1>Visual Tests Summary</h1>
    <table>
      <tr>
        <th>Test Suite</th>
        <th>Total Tests</th>
        <th>Passed</th>
        <th>Failed</th>
      </tr>
      <!-- PLACEHOLDER -->
    </table>
  </body>
</html>
`;
  let html = '';

  summaries.forEach((summary) => {
    const successClass = summary.totalPassed === summary.totalTests ? 'class="success"' : '';
    const dangerClass = summary.totalFailed > 0 ? 'class="danger"' : '';

    html += `<tr>`;
    html += `<td><a href="./${summary.id}/html_report/index.html">${summary.id}</a></td>`;
    html += `<td>${summary.totalTests}</td>`;
    html += `<td ${successClass}>${summary.totalPassed}</td>`;
    html += `<td ${dangerClass}>${summary.totalFailed}</td>`;
    html += `</tr>`;
  });

  const finalHtml = htmlTemplate.replace('<!-- PLACEHOLDER -->', html);

  const reportPath = path.join(backstopDir, 'index.html');
  fs.writeFileSync(reportPath, finalHtml, 'utf-8');
  console.log(chalk.blue(`Snapshot report summary generated at: ${reportPath}`));
};

export async function snapshot(configs: Config[]) {
  const backstopDir = path.join(process.cwd(), '.backstop');
  if (!fs.existsSync(backstopDir)) {
    console.log(chalk.red(`Backstop directory does not exist: ${backstopDir}`));
    return;
  }

  configs.forEach((config) => processTestSuite(backstopDir, config));
}
