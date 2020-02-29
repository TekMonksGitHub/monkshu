const fs = require("fs");
const urlMod = require("url");
const path = require("path");
let wsapireg;

function initSync() {
    if (fs.existsSync(CONSTANTS.WS_API_REGISTRY)) {
        const wsApiRegistryRaw = fs.readFileSync(CONSTANTS.WS_API_REGISTRY);
        LOG.info("Read WebSocket API registry: " + wsApiRegistryRaw);
        wsapireg = JSON.parse(wsApiRegistryRaw);
    }

    fs.readdirSync(CONSTANTS.APPROOTDIR).forEach((app) => {
        if (fs.existsSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/wsapiregistry.json`)) {
            const regThisRaw = fs.readFileSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/wsapiregistry.json`);
            LOG.info("Read App WebSocket API registry: " + regThisRaw);
            const regThis = JSON.parse(regThisRaw);
            Object.keys(regThis).forEach(key => regThis[key] = (`../apps/${app}/${regThis[key]}`));
            wsapireg = { ...wsapireg, ...regThis };
        }
    });

    global.wsapiregistry = this;
};

const getWebSocketAPI = (url) => (wsapireg[url]) ? path.resolve(`${CONSTANTS.ROOTDIR}/${urlMod.parse(wsapireg[url], true).pathname}`) : undefined;

function listWebSocketAPIs() {
    const list = Object.keys(wsapireg);
    const retList = [];
    list.forEach(service => (!service.startsWith("/admin")) ? retList.push(service) : undefined);
    return retList;
};

module.exports = { initSync, getWebSocketAPI, listWebSocketAPIs };
