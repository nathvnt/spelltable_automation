### SpellTable Automation Script 
This script was written using JavaScript and Puppeteer in a Node.js runtime environment. <br/><br/>
It works to generate an empty lobby on [SpellTable](https://spelltable.wizards.com) authenticated as a logged in user. This is done by intercepting and bypassing the request to join the lobby after the game creation request resolves.<br/>

I ended up donating this solution to the Discord [SpellBot](https://spellbot.io), it has now been re-written in PlayWright and is implemented into their code ( [SpellBot GitHub](http://github.com/lexicalunit/spellbot)).<br/><br/>
**NOTE:** This script is configured to cache headless browser data with the **userDataDir** flag. 
This allows for login info to be saved, reducing to the total number of steps taken when generating a SpellTable lobby. 
When the script is run without any login info saved in **./user_data** it will re-direct to a wotc login page. 
I recommended adding a temporary timeout after the **await page.goto** section which will allow for time to manually login (headless set to false) on the first run. 
This timeout can be removed afterwards and login info will persist for subsequent runs.   
