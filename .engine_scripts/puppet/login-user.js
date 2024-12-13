const fs = require('fs');
const YAML = require('js-yaml');
const { clearInterval } = require('timers');
const globalData = {
  domain1: {
    isSiginingIn: false,
    cookies: undefined,
    domain: '',
  },
};
// loginAndSaveCookies.ts
const getSignInData = async () => {
  const signInPath = 'visual_tests/_signing-in.yaml';
  let signInConfig = [];
  // Read Cookies from File, if exists
  if (!!signInPath && fs.existsSync(signInPath)) {
    let content = fs.readFileSync(signInPath);
    if (signInPath.endsWith('.json')) {
      signInConfig = JSON.parse(content);
    } else if (signInPath.endsWith('.yaml') || signInPath.endsWith('.yml')) {
      signInConfig = YAML.load(content);
    }
  }

  return signInConfig;
};
const sleep = (time) => {
  return new Promise((r) => {
    setTimeout(() => {
      r(true);
    }, time);
  });
};
const waitForCondition = (condition = () => true, intervalCheckTime = 1000, maxCheckTime = 30000) => {
  return new Promise((resolve, reject) => {
    if (condition()) {
      resolve(true);
      return;
    }
    let totalCheckedTime = 0;
    let intervalCheckId = setInterval(() => {
      totalCheckedTime += intervalCheckTime;
      if (condition()) {
        clearInterval(intervalCheckId);
        resolve(true);
        return;
      }
      if (totalCheckedTime >= maxCheckTime) {
        clearInterval(intervalCheckId);
        resolve(false);
        return;
      }
    }, intervalCheckTime);
  });
};

const executeSignIn = async (browserContext, domain) => {
  try {
    const pageUrl = domain;
    const signInConfig = await getSignInData();
    const sigInForPage = signInConfig.find((a) => a.domain.includes(pageUrl.host));
    if (!sigInForPage) {
      console.warn('not found signin config for page url', pageUrl);
      return;
    }

    console.log('found signin config for page url', pageUrl);
    const page = await browserContext.newPage();

    console.log('navigate to sigin url', sigInForPage.loginUrl);
    // Navigate to the login page
    await page.goto(sigInForPage.loginUrl);

    const inputData = async (selector, value) => {
      await page.waitForSelector(selector);
      console.log('found selector', selector);
      let el = await page.locator(selector);
      await el.fill(value);
    };
    await inputData(sigInForPage.userNameSelector, sigInForPage.userName);
    await inputData(sigInForPage.passwordSelector, sigInForPage.password);

    await page.waitForSelector(sigInForPage.loginButtonSelector);
    console.log('found selector login button');
    await page.click(sigInForPage.loginButtonSelector);
    await page.waitForNavigation();

    console.log('sign in successfully', page.url());
    // Save cookies after login
    cookies = await browserContext.cookies();
    const loggingCookies = cookies.map((a) => a.name).sort();
    console.log('cookies', loggingCookies);
    return cookies;
  } catch (error) {
    console.error('sign in error', error, domain);
    return undefined;
  }
};
const waitForOtherSiginingIn = async (signInData) => {
  const isSignedIn = await waitForCondition(() => !signInData.isSiginingIn, 1000, 10000);
  return isSignedIn;
};
const getOrSetSignInData = async (browserContext, loginScenario) => {
  const pageUrl = new URL(loginScenario.url);
  const signInDomain = pageUrl.host;
  const signInData = (globalData[signInDomain] = globalData[signInDomain] || {
    isSiginingIn: false,
    cookies: undefined,
    signInDomain: new URL(`${pageUrl.protocol}//${pageUrl.host}`),
  });

  if (!signInData.isSiginingIn) {
    console.log('first signin was called');
    // lock current signin for domain
    signInData.isSiginingIn = true;
    signInData.cookies = await executeSignIn(browserContext, signInData.signInDomain);
    // release lock for domain
    signInData.isSiginingIn = false;
  } else {
    const isSignedInSuccessfully = await waitForOtherSiginingIn(signInData);
    if (isSignedInSuccessfully) {
      console.log('cookies is populated by others, reuse it');
    } else {
      console.log('cookies is not populated by others, start logging in user');
      signInData.cookies = await executeSignIn(browserContext, signInData.signInDomain);
    }
  }

  return signInData;
};
module.exports = async function (browserContext, loginScenario) {
  if (!loginScenario.requiredLogin) {
    console.log('testing scenario run as anonymous user ', loginScenario.label);
    return;
  }
  console.log('testing scenario required login cookies ', loginScenario.label);
  let signInData = await getOrSetSignInData(browserContext, loginScenario);
  if (signInData?.cookies) {
    browserContext.addCookies(signInData.cookies);
    console.log('------login cookies restored for ', loginScenario.label);
  }
};
