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

export const constants = {ERROR_HTML, LANG_ID, PAGE_URL, PAGE_DATA, CACHEWORKER_MSG, WEB_MANIFEST_SUFFIX, 
    PWA_UPDATE_MESSAGE, CACHELIST_SUFFIX, FORCE_NETWORK_FETCH, CONFDIR, LIBDIR};
export const MONKSHU_CONSTANTS = constants; // for backwards compatibility