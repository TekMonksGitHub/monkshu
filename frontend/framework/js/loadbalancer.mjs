/**
 * Manages loads by adopting a frontend load balancing policy.
 * 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

/**
 * Creates a new loadbalancer object.
 * 
 * @param {Object} lbconf The loadbalancer configuration of the format below. 
 *                          {endpoints: [array of IP  or DNSs with optional ports], roothost: the root host}
 *                        If ports are provided they override the URL port.
 * 
 * @returns {Object} The created load balancer.
 */
function createLoadbalancer(lbconf) {
    if (!lbconf) throw Error("Missing load balancer configuration.");
    if (lbconf.balancing_algorithm != "roundrobin") return;    // we can't handle

    return {
        BACKENDCONF: lbconf, _nextEndpoint: undefined,

        canHandle: function(url) {
            try {return new URL(url).host == this.BACKENDCONF.roothost} 
            catch (err) {return false;}
        },
        
        resolveURL: function(url) {
            if ((!this.BACKENDCONF.endpoints) || (this.BACKENDCONF.endpoints.length == 0)) return url;  // no enpoints to balance
            const originalURL = new URL(url);
            const returnedHostIndex = this._nextEndpoint || Math.floor(this.BACKENDCONF.endpoints.length*Math.random());
            this._nextEndpoint = returnedHostIndex + 1 >= this.BACKENDCONF.endpoints.length ? 0 : returnedHostIndex + 1;
            const returnedHost = this.BACKENDCONF.endpoints[returnedHostIndex], newURL = _getReplacedURL(returnedHost, originalURL);
            return newURL;
        },

        getMatchingURLFrom: function(urls, urlToMatch) {
            if (this.BACKENDCONF.endpoints.length == 0) if (urls.includes(urlToMatch)) return urlToMatch;
            for (const urlThis of urls) for (const hostThis of this.BACKENDCONF.endpoints) {
                let parsedURL; try {parsedURL = new URL(urlThis)} catch (err) {continue;}   // skip bad URLs
                const testURL = _getReplacedURL(hostThis, parsedURL);
                if (testURL == urlToMatch) return urlThis;
            }
        },

        getAllBalancedCombinationURLs: function(urlIn) {
            const balancedCombinations = [];
            if (this.BACKENDCONF.endpoints.length == 0) return [urlIn];
            for (const hostThis of this.BACKENDCONF.endpoints) {
                const urlHostMatchingRE = new RegExp("([A-Za-z0-9]+://)([A-Za-z0-9.]+)([:0-9]+)?(.*)");
                const parsedURLPieces = urlIn.match(urlHostMatchingRE);
                if (!parsedURLPieces) continue; // skip bad URLs
                const replacedURL = [parsedURLPieces[1], hostThis, ...parsedURLPieces.slice(3)].join("");
                balancedCombinations.push(replacedURL);
            }
            return balancedCombinations;
        }
    }
}

function _getReplacedURL(newHost, originalURL) {
    const returnedHostURL = new URL("https://"+newHost);
    let finalPort = returnedHostURL.port || originalURL.port; finalPort = finalPort ? ":"+finalPort : "";
    let finalHost = returnedHostURL.hostname;
    const newURL = `${originalURL.protocol}//${originalURL.username}${originalURL.password?":"+originalURL.password:""}${originalURL.username?"@":""}${finalHost}${finalPort}${originalURL.pathname}${originalURL.search}${originalURL.hash}`;
    return newURL;
}

export const loadbalancer = {createLoadbalancer};
