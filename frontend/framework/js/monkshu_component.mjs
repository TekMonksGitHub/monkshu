/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

import {router} from "/framework/js/router.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

function register(name, htmlTemplate, module, roles) {
    // setup security policies
    roles.forEach(role => securityguard.addPermission(htmlTemplate, role));

    // check security policy
    if (!securityguard.isAllowed(htmlTemplate)) return;

    // allow binding of data and dynamic DOM updates
    module.bindData = data => {
        module.data = data; 
        module.element.render(false);
    }

    // register the web component
    customElements.define(name, class extends HTMLElement {

        constructor() {
            super();
            module.element = this;
        }

        static async _diffApplyDom(oldDom, newDom) {
            await $$.require("/framework/3p/diffDOM.js");
            let dd = new diffDOM();
            let diff = dd.diff(oldDom, newDom);
            dd.apply(oldDom, diff);
        }

        async render(initialRender) {
            let componentHTML = await router.loadHTML(htmlTemplate,module.data||{});
            let templateContent = new DOMParser().parseFromString(componentHTML, "text/html");
            let dom = templateContent.documentElement;
            
            if (module.trueWebComponentMode) {
                if (initialRender) {
                    this.attachShadow({mode: "open"}).appendChild(dom);
                    router.runShadowJSScripts(this.shadowRoot, this.shadowRoot);
                    module.shadowRoot = this.shadowRoot;
                }
                else if (this.shadowRoot.firstChild) this.constructor._diffApplyDom(this.shadowRoot.firstChild, dom);
            }
            else {  
                if (initialRender) {
                    this.appendChild(dom); 
                    router.runShadowJSScripts(document, document);
                    module.shadowRoot = document;
                } else if (this.firstChild) this.constructor._diffApplyDom(this.firstChild, dom);
            }
        }

        connectedCallback() {
            this.render(true); 
            if (this.hasAttribute("onload")) eval(this.getAttribute("onload"));
        }

        disconnectedCallback() {
            module.data = null;
        }
    });

    // insert into namespace
    window.monkshu_env.components[name] = module;
}

export const monkshu_component = {register}