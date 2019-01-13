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
    // modern browsers
    else if (document.addEventListener) document.addEventListener('DOMContentLoaded', callback);
    // IE <= 8
    else document.attachEvent('onreadystatechange', _ => {if (document.readyState=='complete') callback();});
}

$$.import = async (url, scope = window) => {
    let result = await import(url);
    Object.keys(result).forEach(key => scope[key] = result[key]);
}

$$.__loadedJS = {};
$$.require = async (url, targetDocument = document) => {
    url = new URL(url, window.location).href;        // Normalize

    if (Object.keys($$.__loadedJS).includes(url)) { // already loaded
        let script = document.createElement("script");
        script.text = $$.__loadedJS[url];
        let scriptNode = script.cloneNode(true);
        targetDocument.head.appendChild(scriptNode).parentNode.removeChild(scriptNode);
    } else try {
        let js = await (await fetch(url, {mode:"no-cors"})).text();
        let script = document.createElement("script");
        script.text = `${js}\n//# sourceURL=${url}`;
        $$.__loadedJS[url] = script.text; 
        let scriptNode = script.cloneNode(true);
        targetDocument.head.appendChild(scriptNode).parentNode.removeChild(scriptNode);
    } catch (err) {throw err};
}

$$.__loadedCSS = [];
$$.requireCSS = url => {
    url = new URL(url, window.location).href;        // Normalize
    if ($$.__loadedCSS.includes(url)) return Promise.resolve();    // already loaded

    return new Promise((resolve, reject) => {
        let link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.onload = _ => resolve();
        link.onerror = _ => reject(`Couldn't load CSS at ${url}`);
        link.href = url;

        document.getElementsByTagName("head")[0].appendChild(link);
    });
}

$$.__loadedJSON = {};
$$.requireJSON = async url => {
    url = new URL(url, window.location).href;        // Normalize

    if (Object.keys($$.__loadedJSON).includes(url)) return $$.__loadedJSON[url];   // already loaded
    else try {
        let json = await (await fetch(url, {mode:"no-cors"})).json();
        $$.__loadedJSON[url]=json; 
        return json;
    } catch (err) {throw err};
}

$$.__loadedPlugins = [];
$$.getLoadedPlugins = _ => $$.__loadedPlugins;
$$.importPlugin = url => {
    url = new URL(url, window.location).href;        // Normalize
    if ($$.__loadedPlugins.includes(url)) return Promise.resolve();   // already loaded

    return new Promise( (resolve, reject) => {
        import (url).then(exported => {
            let moduleName = url.lastIndexOf("/") != -1 ? url.substring(url.lastIndexOf("/")+1) : url;
            moduleName = moduleName.lastIndexOf(".") != -1 ? moduleName.substring(0, moduleName.lastIndexOf(".")) : moduleName;
            $$[moduleName] = exported;
            $$.__loadedPlugins.push(url);
            resolve();
        }).catch(err => reject(err));
    });
}

$$.boot = async appPath => {
    let {bootstrap} = await import("/framework/js/bootstrap.mjs");
    bootstrap(appPath);
}
