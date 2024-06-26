/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

const ERROR_HTML = "/framework/error.html";
const LANG_ID = "com_monkshu_lang";
const PAGE_URL = "__org_monkshu_router_url";
const PAGE_DATA = "__org_monkshu_router_data";

const CACHEWORKER_MSG = "org_monkshu_cacheworker_msg";
const WEB_MANIFEST_SUFFIX = "/conf/webmanifest.json";
const CACHELIST_SUFFIX = "/conf/cachelist.json";
const PWA_UPDATE_MESSAGE = "org_monkshu_pwa_update";
const FORCE_NETWORK_FETCH = "__org_monkshu_router_networkfetch";

const CONFDIR = "/framework/conf";
const LIBDIR = "/framework/js";
const CONFIG_MAIN = `${CONFDIR}/config.json`;

const REMOTE_LOG_ERROR_RETRY_TIMEOUT = 10000;   // if had remote logging issues, wait 10 seconds before retrying.

const DEBUG_LEVELS = Object.freeze({refreshOnReload: "refreshOnReload", refreshAlways: "refreshOnReload", none: "none"});
let CURRENT_DEBUG_LEVEL = DEBUG_LEVELS.none;

export const constants = {ERROR_HTML, LANG_ID, PAGE_URL, PAGE_DATA, CACHEWORKER_MSG, WEB_MANIFEST_SUFFIX, CONFIG_MAIN,
    PWA_UPDATE_MESSAGE, CACHELIST_SUFFIX, FORCE_NETWORK_FETCH, CONFDIR, LIBDIR, REMOTE_LOG_ERROR_RETRY_TIMEOUT,
    DEBUG_LEVELS, setDebugLevel: level => CURRENT_DEBUG_LEVEL=level, getDebugLevel: _ => CURRENT_DEBUG_LEVEL};
export const MONKSHU_CONSTANTS = constants; // for backwards compatibility