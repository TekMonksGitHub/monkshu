/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

////////////////////////////////////////////////
// The global namespace
////////////////////////////////////////////////

function to(promise) {
    return promise.then(data => {return {data}}).catch(err => {return {err}});
}

function $$() {};

$$.import = async (url, scope = window) => {
    let result = await import(url);
    Object.keys(result).forEach(key => scope[key] = result[key]);
}

$$.__loadedJS = {};
$$.require = url => {
    url = new URL(url, window.location).href;        // Normalize

    if (Object.keys($$.__loadedJS).includes(url)) { // already loaded
        let script = document.createElement("script");
        script.text = $$.__loadedJS[url];
        document.head.appendChild(script).parentNode.removeChild(script);
        return Promise.resolve();   
    }

    return new Promise( (resolve, reject) => import("/framework/js/xhr.mjs").
    then(result => result.xhr.get(url)).
    then(js => {
        let script = document.createElement("script");
        script.text = `${js}\n//# sourceURL=${url}`;
        $$.__loadedJS[url] = script.text; 
        document.head.appendChild(script).parentNode.removeChild(script);
        resolve();
    }).
    catch(err => reject(err)) );
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
$$.requireJSON = url => {
    url = new URL(url, window.location).href;        // Normalize
    if (Object.keys($$.__loadedJSON).includes(url)) return Promise.resolve(JSON.parse($$.__loadedJSON[url]));   // already loaded

    return new Promise( (resolve, reject) => import("/framework/js/xhr.mjs").
    then(result => result.xhr.get(url)).
    then(json => {$$.__loadedJSON[url]=json; resolve(JSON.parse(json))}).
    catch(err => reject(err)) );
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
