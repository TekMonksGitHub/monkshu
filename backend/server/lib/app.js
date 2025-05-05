/** 
 * (C) 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025 
 * TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 * 
 * Handles the backend apps.
 */

const fs = require("fs");
const appRoots = [];

function initSync() {
    for (const approotdir of (CONSTANTS.APPROOTDIRS||[CONSTANTS.APPROOTDIR])) 
            if (fs.existsSync(approotdir)) for (const app of fs.readdirSync(approotdir)) {
        
        appThis = {}; appThis[app] = `${approotdir}/${app}`; 
        appRoots.push(appThis);
    }

    initAppsSync(true); // pre-init happens before transport etc are up, init happens later
}

function initAppsSync(preInit=false) {
    for (const appEntry of appRoots) {
        const app = Object.keys(appEntry)[0];
        if (fs.existsSync(`${appEntry[app]}/lib/app.js`)) {
            LOG.info(`${preInit?"Preinitializing":"Initializing"} app: ${app}`);
            const appThis = require(`${appEntry[app]}/lib/app.js`); 
            if (preInit?appThis.preinitSync:appThis.initSync) preInit?appThis.preinitSync(app):appThis.initSync(app); 
        }
    }
}

const getApps = _ => appRoots;
const getAppPath = app => {
    for (const appEntry of appRoots) if (appEntry[app]) return appEntry[app];
    return undefined;
}

module.exports = {initSync, getApps, getAppPath, initAppsSync}