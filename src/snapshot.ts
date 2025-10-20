import path from 'path';
import fs from 'fs';
import backstop, { Config } from 'backstopjs';
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
    if (!configText.includes(`bitmaps_test/${subDir}`) && !configText.includes(`bitmaps_test\\\\${subDir}`)) {
      // Remove unreferenced snapshot directory
      const fullPath = path.join(bitmapTestDir, subDir);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(chalk.yellow(`Removed unreferenced snapshot directory: ${fullPath}`));
    } else {
      // console.log(chalk.green(`Snapshot directory is referenced: ${subDir}`));
      const reportJsonPath = path.join(subDir, 'report.json');
      if (fs.existsSync(reportJsonPath)) {
        const reportText = fs.readFileSync(reportJsonPath, 'utf-8');
        const report = JSON.parse(reportText) as BackstopReport;
        const passCount = report?.tests?.filter((t) => t.status === 'pass').length ?? 0;
        const failCount = report?.tests?.filter((t) => t.status === 'fail').length ?? 0;
        htmlReportSummary.push({
          id: subDir,
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
  let html = `<html><head><title>Snapshot Report Summary</title></head><body>`;
  html += `<h1>Snapshot Report Summary</h1>`;
  html += `<table border="1" cellpadding="5" cellspacing="0">`;
  html += `<tr><th>Snapshot ID</th><th>Total Tests</th><th>Total Passed</th><th>Total Failed</th></tr>`;

  summaries.forEach((summary) => {
    html += `<tr>`;
    html += `<td><a href="./${summary.id}/html_report/index.html">${summary.id}</a></td>`;
    html += `<td>${summary.totalTests}</td>`;
    html += `<td>${summary.totalPassed}</td>`;
    html += `<td>${summary.totalFailed}</td>`;
    html += `</tr>`;
  });

  html += `</table></body></html>`;

  const reportPath = path.join(backstopDir, 'index.html');
  fs.writeFileSync(reportPath, html, 'utf-8');
  console.log(chalk.blue(`Snapshot report summary generated at: ${reportPath}`));
};

export async function snapshot(configs: Config[]) {
  const backstopDir = path.join(process.cwd(), '.backstop');
  if (!fs.existsSync(backstopDir)) {
    return;
  }

  configs.forEach((config) => processTestSuite(backstopDir, config));
}
