/**
 * The global namespace for the Monkshu framework frontend. 
 * (C) 2015 - 2022 TekMonks. All rights reserved.
 * See enclosed LICENSE file.
 */

window.$$ = {_slowNetwork: false};

$$.getRootAppName = _ => {
    const path = new URL(window.location.href).pathname, splits = path.split("/");
    return splits.at(2);
}

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

$$.getOS = _ => {
    if (/(iPhone|iPod|iPad)/i.test(navigator.userAgent)) return "ios";
    if (/android/i.test(navigator.userAgent)) return "android";
    if (/Macintosh/i.test(navigator.userAgent)) return "macos";
    if (/Windows/i.test(navigator.userAgent)) return "windows";
    if (/Linux/i.test(navigator.userAgent)) return "linux";
    return "unknown";
}

$$.setSlowNetwork = slowNetworkFlag => window.$$["_slowNetwork"] = slowNetworkFlag?true:false;
$$.isSlowNetwork = _ => window.$$["_slowNetwork"];

$$.copyTextToClipboard = (text, mime) => {
    if (((!mime) || (mime.toLowerCase() == "text/plain")) && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    
    const type = mime||"text/plain", blob = new Blob([text], { type });
    let blobText; if (type != "text/plan") blobText = new Blob([text.toString()], {type: "text/plain"});
    const clipboardItem = (blobText !== undefined) ? new ClipboardItem({ [blob.type]: blob, [blobText.type]: blobText}) : 
        new ClipboardItem({ [blob.type]: blob });
    const data = [clipboardItem];
    return navigator.clipboard.write(data);
}

$$.__fetchGETThrowErrorOnNotOK = async (url, contentType, corsMode) => {
    const urlToFetch = window.monkshu_env.frameworklibs.router ? 
        window.monkshu_env.frameworklibs.router.getBalancedURL(url) : url;
    try {
        const resolvedCORSMode = corsMode||"cors";
        const response = await fetch(urlToFetch, {method: "GET", mode:resolvedCORSMode, cache: "default", 
            headers: {'Content-Type': contentType||'text/plain'}});
        if (!response.ok) throw new Error(`Issue in fetch for URL ${url}, status returned is ${response.status} ${response.statusText}`);
        else return response;
    } catch (err) {
        throw new Error(`Issue in fetch for URL ${url}, the error is ${err.toString()}`);
    }
}

$$.boot = async (appPath=new URL("./", window.location), confPath=new URL("./conf", window.location)) => {
    const {bootstrapMonkshu} = await import("/framework/js/bootstrap.mjs");
    await bootstrapMonkshu();
    const {bootstrapApp} = await import("/framework/js/bootstrap.mjs");
    bootstrapApp(appPath, confPath);
}