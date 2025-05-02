/**
 * Web bundle support for Monkshu. These classes are loaded before
 * the frontend framework, so they have no dependencies.
 * 
 * (C) 2024 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

/**
 * Adds webbundle support by registering service worker and caching files.
 * @param bundleurl The web bundle URL, default is /apps/<appname>/webbundle/webbundle.txt
 * @param appname The web bundle app name, default is detected from the incoming URL
 * @param timeout The time to wait for the worker to install and become active, else assume failure
 * @returns The registered service worker on success, and false on failure
 */
async function addWebbundleSupport(bundleurl=new URL("./webbundle/webbundle.json", window.location.href).href,
        appname=new URL(window.location.href).pathname.split("/")[2],
        timeout) {
    if (!("serviceWorker" in navigator)) { console.error("Service workers not supported in the browser"); return false; }

    const existingRegistration = await navigator.serviceWorker.getRegistration(bundleurl);
    if (existingRegistration?.active && (!navigator.serviceWorker.controller)) await existingRegistration.unregister();  // if we are not controlling, re-register to force control

    return new Promise(async resolve => {
        let alreadySentFalse = false; 
        const timedOutInstall = (!timeout) ? undefined : setTimeout(_=>{
            alreadySentFalse = true; resolve(false); console.error("Webbundle registration timedout."); }, timeout);
        const encodedWebbundleURL = encodeURIComponent(bundleurl), encodedAppname = encodeURIComponent(appname);
        const webbundlworkerurl = new URL("./webbundleworker.mjs", import.meta.url), 
            webbundlworkerurlwithparams =`${webbundlworkerurl.href}?bundle=${encodedWebbundleURL}&app=${encodedAppname}&rand=${Math.random()}`;
        await navigator.serviceWorker.register(webbundlworkerurlwithparams, {type: "module", scope: "/"});
        const registration = await navigator.serviceWorker.ready; 

        if (!alreadySentFalse) {
            if (timedOutInstall) clearTimeout(timedOutInstall);
            resolve(registration.active);
        }
    });
}

export const webbundlesupport = {addWebbundleSupport};