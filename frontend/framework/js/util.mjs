/**
 * Various utility functions for the frontend. 
 * (C) 2019 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

/**
 * Returns the CSS rule given a docroot from the stylesheets loaded.
 * @param docroot The docroot
 * @param selector The CSS selector
 * @param fullMatch Whether we need a partial or full match
 * @returns The matching CSS rule or null if not found.
 */
function getCSSRule(docroot, selector, fullMatch = true) {
    for (const sheet of docroot.styleSheets) for (const rule of (sheet.cssRules||sheet.rules)) {
        if ((fullMatch && rule.selectorText == selector) || (!fullMatch && rule.selectorText.startsWith(selector))) 
            return rule;
    }

    return null;
}

/**
 * Returns the function found from walking scope given the string which contains nested path.
 * E.g. string can be window.mycoolobject.function and if this exists, it will return that function.
 * @param string The string containing the function name with scope
 * @returns The matching function or null if not found
 */
function getFunctionFromString(string) { // from https://stackoverflow.com/questions/912596/how-to-turn-a-string-into-a-javascript-function-call
    let scope = window;
    const scopeSplit = string.split('.');
    for (let i = 0; i < scopeSplit.length - 1; i++)
    {
        scope = scope[scopeSplit[i]];

        if (scope == undefined) return;
    }

    return scope[scopeSplit[scopeSplit.length - 1]];
}

/**
 * Replace param value in a URL 
 * @param url The URL
 * @param name The param name
 * @param value The new value for the param
 * @returns String href of the new URL
 */
function replaceURLParamValue(url, name, value) {
    const tempURL = new URL(url, window.location);
    tempURL.searchParams.set(name, value);
    return tempURL.href;
}

/**
 * Convert string to boolean native
 * @param value String
 * @returns Corresponding boolean value
 */
function parseBoolean(value) {
    if (!value) return false;
    return String(value).toLowerCase() == "true";
}

/**
 * Escapes HTML in the given text
 * @param text Text containing unescaped HTML
 * @returns Text with escaped HTML
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

/**
 * Download the given file
 * @param contents The file contents, can be an ArrayBuffer/ArrayBufferView (binary) or UTF8 string (text)
 * @param type The MIME type of the data e.g. "application/json" or "text/html" etc.
 * @param filename The filename to use to download the file
 */
function downloadFile(contents, type, filename) {
    const blob = new Blob([contents], {type}), link = document.createElement("a");
    link.download = filename; link.href = window.URL.createObjectURL(blob);
    link.click(); window.URL.revokeObjectURL(link.href); link.remove();
}

/**
 * Returns the URL path to the ES6 module (parent path) given its meta object (module.meta)
 * @param meta The meta object of the module
 * @returns URL path to the module as a string
 */
const getModulePath = meta => `${meta.url.substring(0,meta.url.lastIndexOf("/"))}`;

/**
 * Uploads a single file.
 * @param accept Optional: The MIME type to accept. Default is "*".
 * @param type Optional: Can be "text" or "binary". Default is "text".
 * @returns A promise which resolves to {name - filename, data - string or ArrayBuffer} or rejects with error
 */
function uploadAFile(accept="*/*", type="text") {
    const uploadFiles = _ => new Promise(resolve => {
        const uploader = document.createElement("input"); uploader.setAttribute("type","file"); 
        uploader.style.display = "none"; uploader.setAttribute("accept", accept);
        
        document.body.appendChild(uploader); uploader.onchange = _ => {resolve(uploader.files); document.body.removeChild(uploader); }; 
        uploader.click();
    });

    return new Promise(async (resolve, reject) => {
        const file = (await uploadFiles())[0]; if (!file) {reject("User cancelled upload"); return;}
        try {resolve(await getFileData(file, type));} catch (err) {reject(err);} 
    });
}

/**
 * Reads the given file and returns its data.
 * @param file The File object
 * @param type Optional: Can be "text" or "binary". Default is "text".
 * @returns A promise which resolves to {name - filename, data - string or ArrayBuffer} or rejects with error
 */
function getFileData(file, type="text") {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve({name: file.name, data: event.target.result});
        reader.onerror = _event => reject(reader.error);
        if (type.toLowerCase() == "text") reader.readAsText(file); else reader.readAsArrayBuffer(file);
    });
}

/**
 * Deep clones an object, must be serializable or non-serializable properties must
 * be listed to be skipped
 * @param object The object to clone
 * @param skipProperties Optional: Properties to skip while cloning
 */
function clone(object, skipProperties=[]) {
    if (!skipProperties.length) return JSON.parse(JSON.stringify(object));

    const clone = {}; for (const key in object) if (!skipProperties.includes(key)) clone[key] = JSON.parse(JSON.stringify(object[key]));
    return clone;
}

/**
 * Tries to detect if the given string is URI encoded, and decodes it
 * and returns the decoded string, or the string itself, if it is not
 * URI encoded.
 * @param s A possibly URI encoded string
 * @returns The decoded string, or the string itself, if it is not URI encoded.
 */
function safeURIDecode(s) {
    if (decodeURIComponent(s).length < s.length) return decodeURIComponent(s);
    else return s;
}

/**
 * Returns child element by ID of the given parent element.
 * @param element The parent element.
 * @param id ID of the child wanted.
 * @returns Child element by ID of the given parent element or null if not found.
 */
function getChildByID(element, id) {
    for (const child of element.childNodes) if (child.id == id) return child;
    return null;
}

/**
 * Returns child elements of the given tagname.
 * @param element The parent element.
 * @param tagName Tagname of the children wanted.
 * @returns Returns child elements of the given tanameg.
 */
 function getChildrenByTagName(element, tagName) {
    const retNodes = [];
    for (const child of element.childNodes) if (child.tagName?.toLowerCase() == tagName.toLowerCase()) retNodes.push(child);
    return retNodes;
}

/**
 * Calls the given function at the given intervals with the first call starting immediately.
 * @param {function} functionToCall The function to call
 * @param {number} interval The interval in milliseconds
 * @return The timer
 */
const setIntervalImmediately = (functionToCall, interval) => {functionToCall(); return setInterval(functionToCall, interval)};

/** @return Fully resolved URL for given relative URL */
const resolveURL = urlOrPartialPath => new URL(urlOrPartialPath, window.location.href).href;

/** @return Generated UUID */
function generateUUID() { // Public Domain/MIT: from https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
    let d = new Date().getTime();//Timestamp
    let d2 = ((typeof performance !== "undefined") && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        let r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0; d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0; d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export const util = {getCSSRule, getFunctionFromString, replaceURLParamValue, parseBoolean, escapeHTML, getModulePath,
    downloadFile, uploadAFile, getFileData, clone, resolveURL, safeURIDecode, getChildByID, getChildrenByTagName,
    setIntervalImmediately, generateUUID}