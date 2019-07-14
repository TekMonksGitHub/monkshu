const fs = require("fs");
const urlMod = require("url");
const path = require("path");
let socketservicereg;

const initSync = function () {
    const socketServiceRegistryRaw = fs.readFileSync(CONSTANTS.SOCKET_SERVICE_REGISTRY);
    LOG.info("Read socket service registry: " + socketServiceRegistryRaw);
    socketservicereg = JSON.parse(socketServiceRegistryRaw);

    fs.readdirSync(CONSTANTS.APPROOTDIR).forEach((app) => {
        if (fs.existsSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/socketregistry.json`)) {
            const regThisRaw = fs.readFileSync(`${CONSTANTS.APPROOTDIR}/${app}/conf/socketregistry.json`);
            LOG.info("Read App Socket Service registry: " + socketServiceRegistryRaw);
            const regThis = JSON.parse(regThisRaw);
            Object.keys(regThis).forEach(key => regThis[key] = (`../apps/${app}/${regThis[key]}`));
            socketservicereg = { ...socketservicereg, ...regThis };
        }
    });

    global.socketserviceregistry = this;
};

const getSocketService = (url) => (socketservicereg[url]) ? path.resolve(`${CONSTANTS.ROOTDIR}/${urlMod.parse(socketservicereg[url], true).pathname}`) : undefined;

const listSocketServices = () => {
    const list = Object.keys(socketservicereg);
    const retList = [];
    list.forEach(service => (!service.startsWith("/admin")) ? retList.push(service) : undefined);
    return retList;
};

module.exports = { initSync, getSocketService, listSocketServices };