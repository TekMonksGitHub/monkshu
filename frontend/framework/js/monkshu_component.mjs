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
    module.bindData = (data, id) => {
        if (id) {if (!module.datas) module.datas = {}; module.datas[id] = data;}
        else module.data = data; 

        if (id && module.elements[id]) module.elements[id].render(false);
        else module.element.render(false);
    }

    module.getHostElementID = element => module.trueWebComponentMode ? element.getRootNode().host.id : element.closest(name).id;

    module.getShadowRootByHostId = id => id ? module.shadowRoots[id] : module.shadowRoot;
    module.getShadowRootByContainedElement = element => module.getShadowRootByHostId(module.getHostElementID(element));

    // register the web component
    if (!customElements.get(name)) customElements.define(name, class extends HTMLElement {

        constructor() {
            super();
            if (this.id) {if (!module.elements) module.elements = {}; module.elements[this.id] = this;}
            else module.element = this;
        }

        static async _diffApplyDom(oldDom, newDom) {
            await $$.require("/framework/3p/diffDOM.js");
            let dd = new diffDOM();
            let diff = dd.diff(oldDom, newDom);
            dd.apply(oldDom, diff);
        }

        async render(initialRender) {
            if (!this.componentHTML) this.componentHTML = await router.loadHTML(htmlTemplate,
                this.id?(module.datas?module.datas[this.id]||{}:{}):module.data||{});
            let templateDocument = new DOMParser().parseFromString(this.componentHTML, "text/html");
            let templateRoot = templateDocument.documentElement;
            
            if (module.trueWebComponentMode) {
                if (initialRender) {
                    this.attachShadow({mode: "open"}).appendChild(templateRoot);
                    router.runShadowJSScripts(this.shadowRoot, this.shadowRoot);
                    if (this.id) {if (!module.shadowRoots) module.shadowRoots = {}; module.shadowRoots[this.id]=this.shadowRoot;}
                    else module.shadowRoot = this.shadowRoot;
                }
                else if (this.shadowRoot.firstChild) this.constructor._diffApplyDom(this.shadowRoot.firstChild, templateRoot);
            }
            else {  
                if (initialRender) {
                    this.appendChild(templateRoot); 
                    router.runShadowJSScripts(templateRoot, document);
                    templateRoot.getElementById = id => templateRoot.querySelector(`#${id}`);
                    if (this.id) {if (!module.shadowRoots) module.shadowRoots = {}; module.shadowRoots[this.id]=templateRoot;}
                    else module.shadowRoot = templateRoot;
                } else if (this.firstChild) this.constructor._diffApplyDom(this.firstChild, templateRoot);
            }
        }

        connectedCallback() {
            if (this.hasAttribute("onload")) eval(this.getAttribute("onload"));
            if (module.elementConnected) module.elementConnected(this);
            
            this.render(true); 
        }

        disconnectedCallback() {
            delete module.data;
            delete module.datas;
        }
    });

    // insert into namespace
    window.monkshu_env.components[name] = module;
}

export const monkshu_component = {register}