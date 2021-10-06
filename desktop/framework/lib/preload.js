/**
 * Preload bridge for Monkshu. 
 * (C) TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
const {contextBridge, ipcRenderer} = require('electron');

function _initSync() {
    contextBridge.exposeInMainWorld("__org_monkshu_native", true);  // indicate we are running under Monkshu native
    contextBridge.exposeInMainWorld("api", function() {
        return ipcRenderer.sendSync("api", [...arguments]);
    });
    contextBridge.exposeInMainWorld("apiAsync", async function() {
        return await ipcRenderer.invoke("apiAsync", [...arguments]);
    });
}
_initSync();