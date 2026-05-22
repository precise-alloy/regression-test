import type { Page } from 'puppeteer';
import type { EngineScenario, KeyPressSelector, PuppetClickAndHoverHelper } from '../engine.js';

export default (async (page: Page, scenario: EngineScenario): Promise<void> => {
  const hoverSelector = scenario.hoverSelectors || scenario.hoverSelector;
  const clickSelector = scenario.clickSelectors || scenario.clickSelector;
  const keyPressSelector = scenario.keyPressSelectors || scenario.keyPressSelector;
  const scrollToSelector = scenario.scrollToSelector;
  const postInteractionWait = scenario.postInteractionWait; // selector [str] | ms [int]

  if (keyPressSelector) {
    for (const keyPressSelectorItem of ([] as KeyPressSelector[]).concat(keyPressSelector as KeyPressSelector[])) {
      await page.waitForSelector(keyPressSelectorItem.selector);
      await page.type(keyPressSelectorItem.selector, keyPressSelectorItem.keyPress);
    }
  }

  if (hoverSelector) {
    for (const hoverSelectorIndex of ([] as string[]).concat(hoverSelector as string[])) {
      await page.waitForSelector(hoverSelectorIndex);
      await page.hover(hoverSelectorIndex);
    }
  }

  if (clickSelector) {
    for (const clickSelectorIndex of ([] as string[]).concat(clickSelector as string[])) {
      await page.waitForSelector(clickSelectorIndex);
      await page.click(clickSelectorIndex);
    }
  }

  if (postInteractionWait) {
    await (page as unknown as { waitForTimeout(ms: number): Promise<void> }).waitForTimeout(postInteractionWait as number);
  }

  if (scrollToSelector) {
    await page.waitForSelector(scrollToSelector);
    await page.evaluate((scrollToSel: string) => {
      document.querySelector(scrollToSel)!.scrollIntoView();
    }, scrollToSelector);
  }
}) as PuppetClickAndHoverHelper;
