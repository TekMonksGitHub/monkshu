const fs = require("fs");
const urlMod = require("url");
const path = require("path");
let socketservicereg;

function initSync() {
    let socketServiceRegistryRaw = fs.readFileSync(CONSTANTS.SOCKET_SERVICE_REGISTRY);
    LOG.info("Read socket service registry: " + socketServiceRegistryRaw);
    socketservicereg = JSON.parse(socketServiceRegistryRaw);

    fs.readdirSync(CONSTANTS.APPROOTDIR).forEach(app => {
        if (fs.existsSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/socketserviceregistry.json`)) {
            let regThisRaw = fs.readFileSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/socketserviceregistry.json`);
            LOG.info("Read App Socket Service registry: " + socketServiceRegistryRaw);
            let regThis = JSON.parse(regThisRaw);
            Object.keys(regThis).forEach(key => regThis[key] = (`../apps/${app}/${regThis[key]}`));
            socketservicereg = { ...socketservicereg, ...regThis };
        }
    });

    global.socketserviceregistry = this;
}

function getSocketService(url) {
    if (socketservicereg[url]) return path.resolve(`${CONSTANTS.ROOTDIR}/${urlMod.parse(socketservicereg[url], true).pathname}`);
    else return;
}
function listSocketServices() {
    let list = Object.keys(socketservicereg);
    let retList = [];
    list.forEach(srv => { if (!srv.startsWith("/admin")) retList.push(srv); });
    return retList;
}

module.exports = { initSync, getSocketService, listSocketServices };