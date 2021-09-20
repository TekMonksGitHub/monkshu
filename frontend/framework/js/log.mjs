/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const debug = s => console.debug(`[DEBUG] ${s}`);
const info = s => console.log(`[INFO] ${s}`);
const error = s => console.error(`[ERROR] ${s}`);

export const LOG = {debug, info, error};