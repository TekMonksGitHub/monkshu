/**
 * Web bundle support for Monkshu. These classes are loaded before
 * the frontend framework, so they have no dependencies. 
 * 
 * IMPORTANT NOTE: The last modified time stamp MUST be the same across 
 * all the horizontal clusters of the HTTP server files if clustering is used. 
 * This is VERY important else web bundle caching WILL FAIL. Shared NFS for 
 * web files will achieve this. So will transferring the files via TAR etc. Also
 * the caching uses a special HTTP header x-last-modified-epoch which is Monkshu
 * HTTPD specific. So using another HTTPD will break the caching possibly. If using
 * Cloudflare etc check the headers via HEAD command first to ensure x-last-modified-epoch
 * is present.
 * 
 * (C) 2024 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

/**
 * Adds webbundle support by registering service worker and caching files.
 * @param bundleurl The web bundle URL, default is /apps/<appname>/webbundle/webbundle.txt
 * @param appname The web bundle app name, default is detected from the incoming URL
 * @param webbundleStaleCheck Optional: A function which can check if web bundle is stale. It is passed contextual
 *                              params server_last_modified and cached_last_modified which are epochs of bundle's 
 *                              last modification dates for server and cached (cached_last_modified could be null).
 * @param timeout Optional: The time to wait for the worker to install and become active, else assume failure
 * @returns The registered service worker on success, and false on failure
 */
async function addWebbundleSupport(bundleurl=new URL("./webbundle/webbundle.json", window.location.href).href,
        appname=new URL(window.location.href).pathname.split("/")[2], webbundleStaleCheck,
        timeout) {
    if (!("serviceWorker" in navigator)) { console.error("Service workers not supported in the browser"); return false; }

    const existingRegistration = await navigator.serviceWorker.getRegistration(bundleurl);
    if (existingRegistration?.active && (!navigator.serviceWorker.controller)) await existingRegistration.unregister();  // if we are not controlling, re-register to force control

    return new Promise(async resolve => {
        let alreadySentFalse = false; 
        const timedOutInstall = (!timeout) ? undefined : setTimeout(_=>{
            alreadySentFalse = true; resolve(false); console.error("Webbundle registration timedout."); }, timeout);
        const encodedWebbundleURL = encodeURIComponent(bundleurl), encodedAppname = encodeURIComponent(appname);
        const encodedWebbundleStaleCheck = webbundleStaleCheck ? encodeURIComponent(webbundleStaleCheck) : undefined;
        const webbundlworkerurl = new URL("./webbundleworker.mjs", import.meta.url), 
            webbundlworkerurlwithparams =`${webbundlworkerurl.href}?bundle=${encodedWebbundleURL}&app=${encodedAppname}${encodedWebbundleStaleCheck?`&stalecheck=${encodedWebbundleStaleCheck}`:""}`;
        await navigator.serviceWorker.register(webbundlworkerurlwithparams, {type: "module", scope: "/"});
        const registration = await navigator.serviceWorker.ready; 

        if (!alreadySentFalse) {
            if (timedOutInstall) clearTimeout(timedOutInstall);
            resolve(registration.active);
        }
    });
}

export const webbundlesupport = {addWebbundleSupport};