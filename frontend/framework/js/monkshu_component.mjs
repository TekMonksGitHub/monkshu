/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 * 
 * Web component support. All Monkshu components must call the register function. 
 * Supports both true web component mode or simulated web components (not recommended).
 * 
 * Access to the element's javascript module is via monkshu_env.components[name]
 * 
 * Dynamic data binding is then via monkshu_env.components[name].bindData(data, id).
 */

import {router} from "/framework/js/router.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

function register(name, htmlTemplate, module) {
    // allow binding of data and dynamic DOM updates
    module.bindData = async (data, id) => {
        if (module.dataBound) data = await module.dataBound(id?module.elements[id]:module.element, data);

        if (id) {if (!module.datas) module.datas = {}; module.datas[id] = data;}
        else module.data = data; 

        if (id && module.elements[id]) module.elements[id].render(false);
        else module.element.render(false);
    }

    module.getHostElement = element => module.trueWebComponentMode ? element.getRootNode().host : element.closest(name);
    module.getHostElementID = element => module.trueWebComponentMode ? element.getRootNode().host.id : element.closest(name).id;

    module.getShadowRootByHostId = id => id ? module.shadowRoots[id] : module.shadowRoot;
    module.getShadowRootByContainedElement = element => module.getShadowRootByHostId(module.getHostElementID(element));

    module.getMemory = (id) => {
        id = !id || id == "" ? "__org_monkshu_element_no_id" : id;
        if (!module.memory) module.memory = {}; if (!module.memory[id]) module.memory[id] = {}; return module.memory[id];
    }

    module.getMemoryByContainedElement = element => module.getMemory(module.getHostElementID(element));

    // register the web component
    if (!customElements.get(name)) customElements.define(name, class extends HTMLElement {

        static async _diffApplyDom(oldDom, newDom) {
            await $$.require("/framework/3p/diffDOM.js");
            const dd = new diffDOM();
            const diff = dd.diff(oldDom, newDom);
            dd.apply(oldDom, diff);
        }

        async render(initialRender) {
            // check security policy
            if (this.hasAttribute("roles") && !securityguard.isAllowed(name) && !securityguard.isAllowed(name+this.id)) return;

            // if it has template, or if the component already provided some HTML then honor it,
            // else make it an invisible component, as it has no HTML (case: pure JS components).
            if (htmlTemplate) this.componentHTML = await router.loadHTML(htmlTemplate,
                this.id?(module.datas?module.datas[this.id]||{}:{}):module.data||{}, false);
            else if (!this.componentHTML) this.componentHTML = '<body style="margin: 0px; padding: 0px; height: 0px; display: none">';

            const templateRoot = new DOMParser().parseFromString(this.componentHTML, "text/html").documentElement;
            
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

            if (module.initialRender && initialRender) module.initialRender(this);
            if (module.elementRendered) module.elementRendered(this);
        }

        async connectedCallback() {
            if (this.id) {if (!module.elements) module.elements = {}; module.elements[this.id] = this;}
            else module.element = this;

            if (this.hasAttribute("onload")) await eval(this.getAttribute("onload"));
            if (module.elementConnected) await module.elementConnected(this);
            if (this.hasAttribute("roles")) eval(this.getAttribute("roles")).forEach(role => 
                securityguard.addPermission(this.id ? name+this.id : name, role));
            
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