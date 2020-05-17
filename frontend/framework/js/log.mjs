/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

const debug = s => console.log(`[DEBUG] ${s}`);
const info = s => console.log(`[INFO] ${s}`);
const error = s => console.error(`[ERROR] ${s}`);

export const LOG = {debug, info, error};