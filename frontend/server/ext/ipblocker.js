/** 
 * IP blocker extension for frontend HTTPD
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed file.
 */
const utils = require(conf.libdir+"/utils.js");

let ipblacklist = [];

exports.name = "ipblocker";
exports.initSync = _ => utils.watchFile(`${conf.confdir}/ipblacklist.json`, data=>ipblacklist=JSON.parse(data), conf.ipblacklistRefresh||10000);	
exports.processRequest = async (req, res, _dataSender, _errorSender, _codeSender, _access, error) => {
    if (_isBlacklistedIP(req)) { error.error(`Blocking blacklisted IP ${utils.getClientIP(req)}`); // blacklisted, won't honor
        res.socket.destroy(); res.end(); return true; } 
    else return false;
}

function _isBlacklistedIP(req) {
	let clientIP = utils.getClientIP(req);
	if (req.socket.remoteFamily == "IPv6") clientIP = utils.getEmbeddedIPV4(clientIP)||utils.expandIPv6Address(clientIP);;

	return ipblacklist.includes(clientIP.toLowerCase());
}