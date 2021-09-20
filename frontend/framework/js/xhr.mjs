/** 
 * (C) 2015 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * @deprecated DEPRECATED: Use apimanager.mjs instead
 */

/**
 * @param url @deprecated DEPRECATED: Use apimanager.mjs instead
 */
async function rest(url, type, params) {
    if (!type || type.toUpperCase() == "GET") {
        params = Object.entries(params).map(e => {
            e.forEach((t, i) => e[i] = encodeURIComponent(t)); 
            return e.join("=")
        }).join('&')
        if (params) url += `?${params}`;
        try {return JSON.parse(await get(url))}
        catch (e) {return {result:false, reason:e}}
    }
    else {
        try {return JSON.parse(await post(url, JSON.stringify(params),"application/json"));}
        catch (e) {return {result:false, reason:e}}
    }
}

/**
 * @param url @deprecated DEPRECATED: Use apimanager.mjs instead
 */
function get(url) {
    return new Promise((resolve, reject) => 
        _callXHR("GET", url).then(response => resolve(response)).catch(err => reject(err)));
}

/**
 * @param url @deprecated DEPRECATED: Use apimanager.mjs instead
 */
function post(url, params, contentType) {
    return new Promise((resolve, reject) => 
        _callXHR("POST", url, params, contentType).then(response => resolve(response)).catch(err => reject(err)));
}

export const xhr = {rest, get, post};

function _callXHR(method, url, params, contentType="application/x-www-form-urlencoded") {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        if (method.toUpperCase() == "POST" ) xhr.setRequestHeader("Content-type",contentType);
        xhr.followRedirects = true;

        xhr.onload = _ => {
            if (xhr.status == 200 || xhr.status == 201 || xhr.status == 202) resolve(xhr.responseText);
            else reject(`XMLHTTPRequest error for ${url}, status: ${xhr.statusText}`);
        }
        xhr.onerror = _ => reject(`XMLHTTPRequest error for ${url}`);
        
        if (method.toUpperCase() == "POST" ) xhr.send(params);
        else xhr.send();
    });
}
