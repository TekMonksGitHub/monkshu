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

export const util = {getCSSRule}