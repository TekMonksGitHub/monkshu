/**
 * Logger.
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

let debugFlag = true;

const debug = s => console.debug(`[DEBUG] ${s}`);
const info = s => console.log(`[INFO] ${s}`);
const error = s => console.error(`[ERROR] ${s}`);
const warn = s => console.warn(`[WARNING] ${s}`);
const setDebug = flag => debugFlag = flag;

export const LOG = {debug, info, error, warn, setDebug};