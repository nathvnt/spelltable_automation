const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: false,
    userDataDir: './user_data',
  });

  const page = await browser.newPage();

  // Inject navigation overrides on every new document load
  await page.evaluateOnNewDocument(() => {

    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    
    window.location.assign = function(url) {
      if (url.includes('https://spelltable.wizards.com/game/')) {
        console.log("Blocked navigation via assign to:", url);
      } else {
        originalAssign.call(window.location, url);
      }
    };
    window.location.replace = function(url) {
      if (url.includes('https://spelltable.wizards.com/game/')) {
        console.log("Blocked navigation via replace to:", url);
      } else {
        originalReplace.call(window.location, url);
      }
    };
  });
  

  // first send bot to the spell table lobby
  console.log("navigate to spelltable lobby");
  await page.goto('https://spelltable.wizards.com/lobby', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  //goal is to make api call to create a game then prevent user from joining game
  //this will allow us to make an empty lobby but still capture the game id to build a game link

  // set up request interception to block join game request to spelltable api 
  // as well as any subsequent navigation requests to game page
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (
      req.url().includes('https://spelltable.api.bi.wizards.com/') &&
      req.method() === 'POST'
    ) {
      console.log("Blocking request from:", req.url());
      req.abort();
    } else if (req.isNavigationRequest() && req.url().includes('https://spelltable.wizards.com/game/')) {
      console.log('Blocking navigation request to:', req.url());
      req.abort();
    } else {
      req.continue();
    }
  });
  
  // capture the API response from createGame click
  // set up a promise that resolves when the createGame response is received
  const createGamePromise = new Promise(resolve => {
    page.on('response', async (response) => {
      const targetURL = 'https://kfy7rd3371.execute-api.us-west-2.amazonaws.com/prod/createGame';
      if (
        response.url().startsWith(targetURL) &&
        response.request().method() === 'POST'
      ) {
        try {
          const data = await response.json();
          console.log("Captured createGame response:", data);
          resolve(data);
        } catch (err) {
          console.error("Failed to parse JSON response:", err);
        }
      }
    });
  });

  
  // work around for a custom `waitForXPath` function that works with Puppeteer v24.1.1
  page.waitForXPath = async (selector, options) => {
    return await page.waitForSelector(`xpath/${selector}`, options);
  };


  console.log("loading spelltable lobby");

  // Locate "Create Game" button using XPath with custom waitForXPath function
  const createGameXPath = '//button[contains(., "Create Game")]';
  await page.waitForXPath(createGameXPath, { visible: true, timeout: 40000 });

  const createGameButton = await page.$(`xpath/${createGameXPath}`);
  if (!createGameButton) {
    throw new Error("'Create Game' button not found!");
  }

  await createGameButton.click();
  console.log("beginning game creation");


  // give the game a name once game creation modal is rendered 
  const nameInputSelector = 'input[placeholder="Name"]';
  await page.waitForSelector(nameInputSelector, { visible: true, timeout: 30000 });

  await page.type(nameInputSelector, 'Test');
  console.log("the game has been named");

  //quick pause
  await delay(500);

  // Locate and click "Create" button using verbose XPath
  const createButtonXPath =
  '//button[contains(., "Create") and following-sibling::button[contains(., "Cancel")]]';

  await page.waitForXPath(createButtonXPath, { visible: true, timeout: 30000 });
  const createButton = await page.$(`xpath/${createButtonXPath}`);
  if (!createButton) {
    throw new Error("the 'Create' button was not found");
  }

  await createButton.click();
  console.log("game created");
  // await delay(5000);

  // Wait for createGame API response.
  const createGameResponse = await createGamePromise;

  // Build full game URL from the captured game id.
  const gameId = createGameResponse.id;
  const gameLink = 'https://spelltable.wizards.com/game/' + gameId;
  console.log("spelltable game link :", gameLink);


  //kill the browser as soon as game is created
  await browser.close();
  process.exit(0);
})();
