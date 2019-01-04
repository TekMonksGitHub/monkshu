/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

import {router} from "/framework/js/router.mjs";

function register(name, htmlTemplate, module) {
    module.bindData = data => {
        module.data = data; 
        module.element.render();
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

        async render(initialRender = false) {
            let componentHTML = await router.loadHTML(htmlTemplate,module.data||{});
            let templateContent = new DOMParser().parseFromString(componentHTML, "text/html");
            let dom = templateContent.documentElement;
            
            if (module.trueWebComponentMode) {
                if (initialRender) this.attachShadow({mode: "open"}).appendChild(dom);
                else if (this.shadowRoot.firstChild) this.constructor._diffApplyDom(this.shadowRoot.firstChild, dom);
                
                this.shadowRoot.head = this.shadowRoot.firstChild.firstChild;   // setup head element, just like a real document
                router.runShadowJSScripts(dom, this.shadowRoot);
                module.shadowRoot = this.shadowRoot;
            }
            else {  
                if (this.firstChild) this.constructor._diffApplyDom(this.firstChild, dom);
                else this.appendChild(dom);
                module.shadowRoot = document;
            }
        }

        connectedCallback() {
            this.render(true); 
        }
    });

    // insert into namespace
    window.monkshu_env.components[name] = module;
}

export const monkshu_component = {register}