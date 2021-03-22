# Monkshu Framework - How to guide

### Guide to initiate project with Monkshu Framework

This is a step by step guide to create a project using Monkshu Framework (version 2.01).

## Preliminary Tasks

1. Download Monkshu Framework (version 2.01) codebase to you local from here
    **https://github.com/TekMonksGitHub/monkshu**.
2. Create an empty directory where you would like to setup project, let say it as
    **my-project**.
3. Extract monkshu framework into my-project directory.
4. Rename **"monkshu-master"** to **"monkshu"**.
5. Create a new directory named your project. For instance ​ **sample**.
6. Create the following sub-directories and files. Remember to keep the project
    directory named exactly the same in inside directories.

```
<my-project>/monkshu/frontend/framework/conf/default_app.json
/sample/backend
/sample/backend/apps
/sample/backend/apps/sample
/sample/backend/apps/sample/3p
/sample/backend/apps/sample/apis
/sample/backend/apps/sample/apis/lib
/sample/backend/apps/sample/apis/lib/constants.js
/sample/backend/apps/sample/apis/lib/utils.js
/sample/backend/apps/sample/conf
/sample/backend/apps/sample/conf/apiregistry.json
/sample/backend/apps/sample/db
/sample/frontend
/sample/frontend/apps
/sample/frontend/apps/sample
/sample/frontend/apps/sample/3p
/sample/frontend/apps/sample/components
/sample/frontend/apps/sample/css
/sample/frontend/apps/sample/i18n
/sample/frontend/apps/sample/i18n/i18n_en.mjs
/sample/frontend/apps/sample/img
/sample/frontend/apps/sample/js
/sample/frontend/apps/sample/js/lib
/sample/frontend/apps/sample/js/application.mjs
/sample/frontend/apps/sample/js/constants.mjs
/sample/frontend/apps/sample/index.html
```

7. Now make symlinks (shortcut) to map this project with Monkshu framework
a. Go to ​ **my-project/monkshu/backend/apps​** and run below command

```sh
$ ln -s <path-to-my-project>/sample/backend/apps/sample .
```

b. Go to ​ **my-project/monkshu/frontend/apps​** and run below command

```sh
$ ln -s <path-to-my-project>/sample/frontend/apps/sample .
```

8. Run below command in ​ **/sample/backend/apps/sample/3p/​** directory

```sh
$ ​ npm init
```

9. Create below files as part of initial setup
a. Create file and copy below text in
       **<my-project>/monkshu/frontend/framework/conf/default_app.json**

```json
“sample”
```

b. Copy below code into file **​ /sample/backend/apps/sample/apis/lib/constants.js​**

```js
/*
* (C) 2020 TekMonks. All rights reserved.
* License: MIT - see enclosed LICENSE file.
*/
const​ ​path​ = ​require​(​"path"​);
APP_ROOT​ = ​`​${​path​.​resolve​(​`​${​__dirname​}​/../../`​)​}​`​;
exports​.​APP_ROOT​ = ​APP_ROOT​;
exports​.​CONF_DIR​ = ​`​${​APP_ROOT​}​/conf`​;
// LIB_PATH: Location to APIs lib directory
exports​.​LIB_PATH​ = ​path​.​resolve​(​__dirname​ + ​"/../lib"​);
// Simple API Response for success or failure
exports​.​API_RESPONSE_TRUE​ = { ​result:​ ​true​ };
exports​.​API_RESPONSE_FALSE​ = { ​result:​ ​false​ };
```

c. Copy below code into file ​**/sample/backend/apps/sample/apis/lib/utils.js​**

```js
/**
* (C) 2020 TekMonks. All rights reserved.
* License: MIT - see enclosed LICENSE file.
*/

/**
* Generate random RFC-compliant UUIDs in JavaScript
* source: https://github.com/kelektiv/node-uuid
*/
module​.​exports​.​uniqid​ = () ​=>​ ​require​(​__dirname​ + "/../../3p/node_modules/uuid/v4"​)();

/** Generate random number using current timestamp */
module​.​exports​.​randomNumber​ = () ​=>​ ​Math​.​floor​(​Math​.​random​() * Date​.​now​() / ​ 1000 ​);

/** Generate random characters can be used as strong password */
module​.​exports​.​randomCharacters​ = (​length​ = ​ 20 ​, ​wishlist​ = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$"​) =>​ 
    Array​(​length​).​fill​(​''​).​map​(() ​=>​ ​wishlist​[​Math​.​floor​(​Math​.​random​() * wishlist​.​length​)]).​join​(​''​);

/** Enable or disable info logs from here */
module​.​exports​.​captureInfoLog​ = (​toLog​, ​disableLog​ = ​false​) ​=> (!​disableLog​)? ​LOG​.​info​(​toLog​) : ​undefined​;

/** Get Unixtimestamp */
module​.​exports​.​getTimestamp​ = (​date​) ​=>​ (​date​)? ​new Date​(​date​).​getTime​() : ​new​ ​Date​().​getTime​();

/** String passed string for new line or additional spaces */
module​.​exports​.​stripString​ = (​inputString​) ​=>​ (​inputString​) ? inputString​.​replace​(​/​(​\r\n​|​\n​|​\r​)​/​gm​, ​""​).​replace​(​/\s​+​/​g​, ​' '​) : ​""​;

/** Returns Array of unique values within the provided Array */
module​.​exports​.​getUniqueValues​ = (​inputArray​) ​=> Object​.​values​(​inputArray​).​filter​((​value​, ​index​, ​self​) ​=> (​self​.​indexOf​(​value​) === ​index​));

/** Get Current Unix timestamp without milliseconds */

module​.​exports​.​getCurrentUnixTimestamp​ = () ​=>​ (​new​ ​Date​().​getTime​() / 1000 ​).​toString​().​split​(​'.'​)[​ 0 ​];
```

d. Copy below code into file ​**/sample/backend/apps/sample/conf/apiregistry.json**.

```json
{}
```

## Backend API creation:

1. Create your first two sample APIs as follows.

a. Copy below code into file ​ **/sample/backend/apps/sample/conf/apiregistry.json**.

```json
{
    ​"/apis/message"​ : "/apis/message.js?needsToken=false&addsToken=sub:access"​,
    ​"/apis/random"​ : "/apis/random.js?get=true&key=Mk6DAu4beAzqD6I63Z1jRgQ5WTDa6zQO&needsToken=true"
}
```
b. Create files
**/sample/backend/apps/sample/apis/message.js**
**/sample/backend/apps/sample/apis/random.js**

c. Copy below code in file
**/sample/backend/apps/sample/apis/message.js**

```js
/*
* (C) 2020 TekMonks. All rights reserved.
* License: MIT - see enclosed LICENSE file.
*/

// Custom modules
const​ ​API_CONSTANTS​ = require​(​`​${​CONSTANTS​.​APPROOTDIR​}​/sample/apis/lib/constants`​);

exports​.​doService​ = ​async​ ​jsonReq​ ​=>​ {

    ​// Validate API request and check mandatory payload required
    ​if​ (!​validateRequest​(​jsonReq​)) ​return API_CONSTANTS​.​API_INSUFFICIENT_PARAMS​;

    ​try​ {
        ​const​ ​message​ = ​await​ ​getMessage​(​jsonReq​);
        ​if​ (!​message​) ​return​ ​API_CONSTANTS​.​API_RESPONSE_FALSE​;
        ​return​ { ​result:​ ​true​, ​results:​ { ​message​ } };

    } ​catch​ (​error​) {
        ​console​.​error​(​error​);
        ​return​ ​API_CONSTANTS​.​API_RESPONSE_SERVER_ERROR​;
    }
}

const​ ​getMessage​ = ​async​ (​jsonReq​) ​=>​ {
    ​try​ { 
        if​(​jsonReq​) ​return​ ​"This is your first API"​;
    } ​catch​ (​error​) {
        ​throw​ ​error​;
    }
}

const​ ​validateRequest​ = ​jsonReq​ ​=>​ (​jsonReq​);
```

d. Copy below code in file
**/sample/backend/apps/sample/apis/random.js**

```js
/*
* (C) 2020 TekMonks. All rights reserved.
* License: MIT - see enclosed LICENSE file.
*/

// Custom modules
const​ ​API_CONSTANTS​ = require​(​`​${​CONSTANTS​.​APPROOTDIR​}​/sample/apis/lib/constants`​);
const​ ​utils​ = ​require​(​`​${​API_CONSTANTS​.​LIB_PATH​}​/utils`​);

exports​.​doService​ = ​async​ ​jsonReq​ ​=>​ {

    ​// Validate API request and check mandatory payload required
    ​if​ (!​validateRequest​(​jsonReq​)) ​return API_CONSTANTS​.​API_INSUFFICIENT_PARAMS​;

    ​try​ {
        ​const​ ​random​ = ​await​ ​getRandom​(​jsonReq​);
        ​if​ (!​random​) ​return​ ​API_CONSTANTS​.​API_RESPONSE_FALSE​;
        ​return​ { ​result:​ ​true​, ​results:​ { ​random​ } };

    } ​catch​ (​error​) {
        ​console​.​error​(​error​);
        ​return​ ​API_CONSTANTS​.​API_RESPONSE_SERVER_ERROR​;
    }
}

const​ ​getRandom​ = ​async​ (​jsonReq​) ​=>​ {
    ​try​ {
    ​   if​(​jsonReq​) ​return​ ​utils​.​randomCharacters​();
    } ​catch​ (​error​) {
        ​throw​ ​error​;
    }
}

const​ ​validateRequest​ = ​jsonReq​ ​=>​ (​jsonReq​);
```

2. Run backend server as below
a. Open terminal and go to **​<my-project>/monkshu/backend/server/**

```sh
$ node server
```
3. Open any Rest client application like **“postman”**

a. Enter url as ​**http://localhost:9090/apis/message**
You would see the following result in return from server

```json
{
    ​"result"​: ​true​,
    ​"results"​: {
    ​   "message"​: ​"This is your first API"
    }
}
```
You would also get access_token in headers look at it

Note: Monkshu support JWT tokens to secure apis access

b. Enter url as ​**http://localhost:9090/apis/random**
You would see the following result in return from server

```
403 Unauthorized or forbidden
```
Note: You are not able to get a response because you have to pass access_token in
subsequent APIs as security practices.

## Frontend Setup:

1. Copy codes to required files
    a. Copy below code to file ​ **/sample/frontend/app/sample/index.html**.

```html
<!--
(C) 2020 TekMonks. All rights reserved.
License: MIT - see enclosed license.txt file.
-->
<!​doctype​ ​html​>
<​html​>

<​head​>
    ​<​meta​ ​charset​=​"UTF-8"​>
    ​<​meta​ ​http-equiv​=​"pragma"​ ​content​=​"no-cache"​>
    ​<​meta​ ​http-equiv​=​"expires"​ ​content​=​"-1"​>
    ​<​meta​ ​name​=​viewport​ ​content​=​"width=device-width, initial-scale=1.0,
    minimum-scale=0.5 maximum-scale=1.0"​>
    ​<​title​>​Sample​</​title​>
    ​<!-- Include the monkshu framework -->
    ​<​script​ ​type​=​"text/javascript"​ ​src​=​"/framework/js/$$.js"​></​script​>
    ​<!-- And off we go ... -->
    ​<​script​ ​type​=​"text/javascript"​>​$$​.​boot​(​new​ ​URL​(​"./"​,window​.​location​));​</​script​>
</​head​>

</​html​>
```

b. Copy below code to file ​ **/sample/frontend/app/sample/js/application.mjs**.

```js
/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
 
import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {apimanager as apiman} from "/framework/js/apimanager.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

const init = async _ => {
	window.APP_CONSTANTS = (await import ("./constants.mjs")).APP_CONSTANTS;
	window.LOG = (await import ("/framework/js/log.mjs")).LOG;
	if (!session.get($$.MONKSHU_CONSTANTS.LANG_ID)) session.set($$.MONKSHU_CONSTANTS.LANG_ID, "en");
	securityguard.setPermissionsMap(APP_CONSTANTS.PERMISSIONS_MAP);
	securityguard.setCurrentRole(securityguard.getCurrentRole() || APP_CONSTANTS.GUEST_ROLE);
}

const main = async _ => {
	apiman.registerAPIKeys(APP_CONSTANTS.API_KEYS, APP_CONSTANTS.KEY_HEADER);
	let location = window.location.href;
	if (!router.isInHistory(location) || !session.get(APP_CONSTANTS.USERID))
		router.loadPage(APP_CONSTANTS.MESSAGE_HTML);
	else 
		router.loadPage(location);
}

export const application = {init, main};
```

c. Copy below code to file ​ **/sample/frontend/app/sample/js/constants.mjs**.

```js
/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
const FRONTEND = "http://localhost:8080";
const BACKEND = "http://localhost:9090";
const APP_NAME = "sample";
const APP_PATH = `${FRONTEND}/apps/${APP_NAME}`;

export const APP_CONSTANTS = {
    FRONTEND, BACKEND, APP_PATH, APP_NAME,
    MESSAGE_HTML: APP_PATH + "/message.html",
    RANDOM_HTML: APP_PATH + "/random.html",

    SESSION_NOTE_ID: "com_monkshu_ts",

    API_MESSAGE: `${BACKEND}/apis/message`,
    API_RANDOM: `${BACKEND}/apis/random`,

    USERID: "id",
    USER_ROLE: "user",
    GUEST_ROLE: "guest",
    PERMISSIONS_MAP: {
        user: [APP_PATH + "/message.html", $$.MONKSHU_CONSTANTS.ERROR_THTML],
        guest: [APP_PATH + "/random.html", APP_PATH + "/message.html", $$.MONKSHU_CONSTANTS.ERROR_THTML]
    },
    API_KEYS: { "*": "uiTmv5YBOZMqdTb0gekD40PnoxtB9Q0k" },
    KEY_HEADER: "X-API-Key"
}

```
**Note: ​** Look for frontend page constants​ **MESSAGE_HTML, RANDOM_HTML**

And API constants​ **API_MESSAGE, API_RANDOM**

d. Copy below code to file ​ **/sample/frontend/apps/sample/i18n/i18n_en.mjs**.

```js
export​ ​const​ ​i18n​ = {
"Title"​ :​ ​"Sample"​,
}
```

2. Create two files for frontend pages as
a. Copy below code to file ​ **/sample/frontend/apps/sample/message.html**.

```html
<!doctype html>
<html>

<head>
	<meta charset="UTF-8">

	<title>{{i18n.Title}}</title>

	<script type="module">
		import { app_message } from "./components/app-message/app-message.mjs"; app_message.register();
	</script>
</head>

<body>
	<app-message></app-message>
</body>

</html>
```

b. Copy below code to file ​ **/sample/frontend/apps/sample/random.html**.

```html
<!doctype html>
<html>

<head>
	<meta charset="UTF-8">

	<title>{{i18n.Title}}</title>

	<script type="module">
		import { app_random } from "./components/app-random/app-random.mjs"; app_random.register();
	</script>
</head>

<body>
	<app-random></app-random>
</body>

</html>
```

### Create following components

1. Create **app-message** directory in components folder and create below files
a. Create file and copy below code
       **/sample/frontend/apps/sample/components/app-message/app-message.html**.

```html
<​div​ ​id​=​"app-message"​>
​<​input​ ​type​=​"text"​ ​name​=​"message"​ ​id​=​"message"​ ​/>
​<​input​ ​type​=​"button"​ ​value​=​"Get Message!"​ ​id​=​"get-message"
onclick​=​'​monkshu_env​.​components​["app-message"].​getMessage​()'​>
</​div​>
```
b. Create file and copy below code
**/sample/frontend/apps/sample/components/app-message/app-message.mjs**.

```js
/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import { router } from "/framework/js/router.mjs";
import { monkshu_component } from "/framework/js/monkshu_component.mjs";
import { apimanager as apiman } from "/framework/js/apimanager.mjs";

const getMessage = async () => {
    let resp = await apiman.rest(APP_CONSTANTS.API_MESSAGE, "POST", {}, false, true);
    if (!resp || !resp.result) router.reload();
    app_message.shadowRoot.querySelector("#message").value = resp.results.message;
    setTimeout(() => {
        router.loadPage(APP_CONSTANTS.RANDOM_HTML);
    }, 3000);
}

function register() {
    // convert this all into a WebComponent so we can use it
    monkshu_component.register("app-message", `${APP_CONSTANTS.APP_PATH}/components/app-message/app-message.html`, app_message);
}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM

export const app_message = { trueWebComponentMode, register, getMessage }
```
2. Create app-random directory in components folder and create below files
a. Create file and copy below code
**/sample/frontend/apps/sample/components/app-random/app-random.html**.

```html
<​div​ ​id​=​"app-random"​>
​<​input​ ​type​=​"text"​ ​name​=​"random"​ ​id​=​"random"​ ​/>
​<​input​ ​type​=​"button"​ ​value​=​"Get Random String!"​ ​id​=​"get-random"
onclick​=​'​monkshu_env​.​components​["app-random"].​getRandomString​()'​>
</​div​>
```

b. Create file and copy below code
**/sample/frontend/apps/sample/components/app-random/app-random.mjs**.

```js
/* 
 * (C) 2020 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */
import { router } from "/framework/js/router.mjs";
import { monkshu_component } from "/framework/js/monkshu_component.mjs";
import { apimanager as apiman } from "/framework/js/apimanager.mjs";

const getRandomString = async () => {
    let resp = await apiman.rest(APP_CONSTANTS.API_RANDOM, "POST", {}, true);
    if (!resp.result) router.reload();
    app_random.shadowRoot.querySelector("#random").value = resp.results.random;
}

function register() {
    // convert this all into a WebComponent so we can use it
    monkshu_component.register("app-random", `${APP_CONSTANTS.APP_PATH}/components/app-random/app-random.html`, app_random);
}

const trueWebComponentMode = true;	// making this false renders the component without using Shadow DOM

export const app_random = { trueWebComponentMode, register, getRandomString }
```

3. Now start frontend server by going to location in terminal

**<my-project>/frontend/server/**

```sh
$ node server
```
4. Now go to browser and hit url as **​`http://localhost:8080/`**

You will see a page having an input box type text with a button.

Upon clicking on “Get Message!” button you will get message from server and it will appear
in box, after 3 second this page will redirect to next page (random page)

Upon clicking on “Get Random String!” will fill box with random string from server
