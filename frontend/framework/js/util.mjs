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
    url = new URL(url, window.location);
    url.searchParams.set(name, value);
    return url.href;
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

export const util = {getCSSRule, getFunctionFromString, replaceURLParamValue, parseBoolean, escapeHTML, getModulePath,
    downloadFile}