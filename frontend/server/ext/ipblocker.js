/** 
 * IP blocker extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */
const fs = require("fs");
const utils = require(conf.libdir+"/utils.js");

let ipblacklist = [], lastIPBlacklistCheckTime = -1;

exports.name = "ipblocker";
exports.initSync = _ => utils.setIntervalImmediately(_reloadIPBlacklist, conf.ipblacklistRefresh||10000);	
exports.processRequest = async (req, res, _dataSender, _errorSender, _access, error) => {
    if (_isBlacklistedIP(req)) { error.error(`Blocking blacklisted IP ${utils.getClientIP(req)}`); // blacklisted, won't honor
        res.socket.destroy(); res.end(); return true; } 
    else return false;
}

async function _reloadIPBlacklist() {
	const stats = await fs.promises.stat(`${conf.confdir}/ipblacklist.json`); 
    if (stats.mtimeMs != lastIPBlacklistCheckTime) {
		lastIPBlacklistCheckTime = stats.mtimeMs;
		ipblacklist = JSON.parse(await fs.promises.readFile(`${conf.confdir}/ipblacklist.json`, "utf8"));
	}
}

function _isBlacklistedIP(req) {
	let clientIP = utils.getClientIP(req);
	if (req.socket.remoteFamily == "IPv6") clientIP = utils.getEmbeddedIPV4(clientIP)||utils.expandIPv6Address(clientIP);;

	return ipblacklist.includes(clientIP.toLowerCase());
}