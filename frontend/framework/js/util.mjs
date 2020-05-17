/* 
 * (C) 2019 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

function getCSSRule(docroot, selector, fullMatch = true) {
    for (let sheet of docroot.styleSheets) for (let rule of (sheet.cssRules||sheet.rules)) {
        if ((fullMatch && rule.selectorText == selector) || (!fullMatch && rule.selectorText.startsWith(selector))) 
            return rule;
    }

    return null;
}

// from https://stackoverflow.com/questions/912596/how-to-turn-a-string-into-a-javascript-function-call
function getFunctionFromString(string) {
    let scope = window;
    let scopeSplit = string.split('.');
    for (let i = 0; i < scopeSplit.length - 1; i++)
    {
        scope = scope[scopeSplit[i]];

        if (scope == undefined) return;
    }

    return scope[scopeSplit[scopeSplit.length - 1]];
}

function replaceURLParamValue(url, name, value) {
    url = new URL(url, window.location);
    url.searchParams.set(name, value);
    return url.href;
}

function parseBoolean(value) {
    if (!value) return false;
    return String(value).toLowerCase() == "true";
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

export const util = {getCSSRule, getFunctionFromString, replaceURLParamValue, parseBoolean, escapeHTML}