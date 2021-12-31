/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

////////////////////////////////////////////////
// The global namespace
////////////////////////////////////////////////

window.$$ = {};

$$.ready = callback => {
    // in case the document is already rendered
    if (document.readyState!='loading') callback();
    else if (document.addEventListener) document.addEventListener('DOMContentLoaded', callback)
}

$$.import = async (url, scope = window) => {
    const result = await import(url);
    for (const key in result) scope[key] = result[key];
}

$$.__loadedJS = {};
$$.require = async (url, targetDocument = document, nocache, corsMode) => {
    url = new URL(url, window.location).href;        // Normalize

    if (Object.keys($$.__loadedJS).includes(url) && !nocache) { // already loaded
        const script = document.createElement("script");
        script.text = $$.__loadedJS[url];
        const scriptNode = script.cloneNode(true);
        targetDocument.head.appendChild(scriptNode).parentNode.removeChild(scriptNode);
    } else try {
        const js = await (await $$.__fetchGETThrowErrorOnNotOK(url, "application/javascript", corsMode)).text();
        const script = document.createElement("script");
        script.text = `${js}\n//# sourceURL=${url}`;
        $$.__loadedJS[url] = script.text; 
        const scriptNode = script.cloneNode(true);
        targetDocument.head.appendChild(scriptNode).parentNode.removeChild(scriptNode);
    } catch (err) {throw err};
}

$$.__loadedCSS = [];
$$.requireCSS = (url, nocache) => {
    url = new URL(url, window.location).href;        // Normalize
    if ($$.__loadedCSS.includes(url) && !nocache) return Promise.resolve();    // already loaded

    return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.type = "text/css"; link.rel = "stylesheet"; link.href = url;
        link.onload = _ => resolve(); link.onerror = _ => reject(`Couldn't load CSS at ${url}`);
        document.getElementsByTagName("head")[0].appendChild(link);
    });
}

$$.__loadedJSON = {};
$$.requireJSON = async (url, nocache, corsMode) => {
    url = new URL(url, window.location).href;        // Normalize

    if (Object.keys($$.__loadedJSON).includes(url) && !nocache) return $$.__loadedJSON[url];   // already loaded
    else try {
        const json = await (await $$.__fetchGETThrowErrorOnNotOK(url, "application/json", corsMode)).json();
        $$.__loadedJSON[url]=json; return $$.__loadedJSON[url];
    } catch (err) {throw err};
}

$$.__loadedText = {};
$$.requireText = async (url, nocache, corsMode) => {
    url = new URL(url, window.location).href;        // Normalize

    if (Object.keys($$.__loadedText).includes(url) && !nocache) return $$.__loadedText[url];   // already loaded
    else try {
        const text = await (await $$.__fetchGETThrowErrorOnNotOK(url, "text/plain", corsMode)).text();
        $$.__loadedText[url]=text; return $$.__loadedText[url];
    } catch (err) {throw err};
}

$$.__loadedPlugins = [];
$$.getLoadedPlugins = _ => $$.__loadedPlugins;
$$.importPlugin = (url, nocache) => {
    url = new URL(url, window.location).href;        // Normalize
    if ($$.__loadedPlugins.includes(url) && !nocache) return Promise.resolve();   // already loaded

    return new Promise( (resolve, reject) => {
        import (url).then(exported => {
            let moduleName = url.lastIndexOf("/") != -1 ? url.substring(url.lastIndexOf("/")+1) : url;
            moduleName = moduleName.lastIndexOf(".") != -1 ? moduleName.substring(0, moduleName.lastIndexOf(".")) : moduleName;
            $$[moduleName] = exported;
            $$.__loadedPlugins.push(url); resolve();
        }).catch(err => reject(err));
    });
}

$$.isMobile = _ => (navigator.userAgent.toLowerCase().includes("mobile")||navigator.userAgent.toLowerCase().includes("opera mobi"));

$$.isPortraitScreen = _ => window.screen.orientation?.type == "portrait-primary" || window.orientation == 0;

$$.__fetchGETThrowErrorOnNotOK = async (url, contentType, corsMode) => {
    const response = await fetch(url, {method: "GET", mode:corsMode||"cors", cache: "default", 
        headers: {'Content-Type': contentType||'text/plain'}});
    if (!response.ok) throw new Error(`Issue in fetch, status returned is ${response.status} ${response.statusText}`);
    else return response;
}

$$.boot = async appPath => {
    $$.LOG = (await import("/framework/js/log.mjs")).LOG;
    const {bootstrap} = await import("/framework/js/bootstrap.mjs");
    bootstrap(appPath);
}