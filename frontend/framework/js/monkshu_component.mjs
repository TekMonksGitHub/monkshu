/** 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * Web component support. All Monkshu components must call the register function. 
 * Supports both true web component mode or simulated web components (not recommended).
 * 
 * Access to the element's javascript module is via window.monkshu_env.components[name]
 * 
 * Dynamic data binding is then via monkshu_env.components[name].bindData(data, id).
 */

import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";
import {securityguard} from "/framework/js/securityguard.mjs";

function register(name, htmlTemplate, module) {
    if (window.monkshu_env.components[name]) return;    // already regisered
    
    // allow binding of data and dynamic DOM updates
    module.bindData = async (data, id) => {
        if (module.dataBound) data = await module.dataBound(id?module.elements[id]:module.element, data);

        if (id) {if (!module.datas) module.datas = {}; module.datas[id] = data;}
        else module.data = data; 

        if (id && module.elements[id]) await module.elements[id].render(false);
        else await module.element.render(false);
    }

    module.getData = id => id?module.datas[id]:module.data;

    module.getHostElementByID = id => module.elements[id];
    module.getHostElement = element => module.trueWebComponentMode ? element.getRootNode().host : element.closest(name);
    module.getHostElementID = element => module.trueWebComponentMode ? element.getRootNode().host.id : element.closest(name).id;

    module.getShadowRootByHost = host => module.getShadowRootByHostId(host.id);
    module.getShadowRootByHostId = id => id ? module.shadowRoots[id] : module.shadowRoot;
    module.getShadowRootByContainedElement = element => module.getShadowRootByHostId(module.getHostElementID(element));

    module.getMemory = id => {
        id = !id || id == "" ? "__org_monkshu_element_no_id" : id;
        if (!module.memory) module.memory = {}; if (!module.memory[id]) module.memory[id] = {}; return module.memory[id];
    }

    module.clearMemory = id => {
        id = !id || id == "" ? "__org_monkshu_element_no_id" : id;
        if (module.memory) delete module.memory[id];
    }

    module.getSessionMemory = id => {
        if (!session.get(`__org_monkshu_element_${name}_memory`)) session.set(`__org_monkshu_element_${name}_memory`, {});
        const memory = session.get(`__org_monkshu_element_${name}_memory`);
        id = !id || id == "" ? "__org_monkshu_element_no_id" : id; if (!memory[id]) memory[id] = {}; 
        return memory[id];
    }

    module.clearSessionMemory = id => {
        const memory = session.get(`__org_monkshu_element_${name}_memory`) || {};
        id = !id || id == "" ? "__org_monkshu_element_no_id" : id;
        if (memory[id]) delete memory[id]; session.set(`__org_monkshu_element_${name}_memory`, memory);
    }

    module.getMemoryByContainedElement = element => module.getMemory(module.getHostElementID(element));

    module.getMemoryByHost = hostElement => module.getMemory(hostElement.id);

    module.getAllElementInstances = _ => {
        const allInstances = []; 
        if (module.elements) for (const key in module.elements) allInstances.push(module.elements[key]); 
        else if (module.element) allInstances.push(module.element);
        return allInstances;
    }

    module.reload = async id => {
        module.clearMemory(id); 
        if (module.elementConnected) await module.elementConnected(module.elements[id]); 
        await module.elements[id].render(false);
    }

    module.getComponentPath = meta => `${meta.url.substring(0,meta.url.lastIndexOf("/"))}`;

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
                    await router.runShadowJSScripts(this.shadowRoot, this.shadowRoot);
                    if (this.id) {if (!module.shadowRoots) module.shadowRoots = {}; module.shadowRoots[this.id]=this.shadowRoot;}
                    else module.shadowRoot = this.shadowRoot;
                }
                else if (this.shadowRoot.firstChild) await this.constructor._diffApplyDom(this.shadowRoot.firstChild, templateRoot);
            }
            else {  
                if (initialRender) {
                    this.appendChild(templateRoot); 
                    await router.runShadowJSScripts(templateRoot, document);
                    templateRoot.getElementById = id => templateRoot.querySelector(`#${id}`);
                    if (this.id) {if (!module.shadowRoots) module.shadowRoots = {}; module.shadowRoots[this.id]=templateRoot;}
                    else module.shadowRoot = templateRoot;
                } else if (this.firstChild) await this.constructor._diffApplyDom(this.firstChild, templateRoot);
            }

            if (module.initialRender && initialRender) await module.initialRender(this);
            if (module.elementRendered) await module.elementRendered(this);
        }

        async connectedCallback() {
            if (!this.isConnected) return;  // not in a DOM tree
            
            if (this.id) {if (!module.elements) module.elements = {}; module.elements[this.id] = this;}
            else module.element = this;

            if (this.hasAttribute("onload")) await eval(this.getAttribute("onload"));
            module.clearMemory(this.id);
            if (module.elementConnected) await module.elementConnected(this);
            if (this.hasAttribute("roles")) for (const role of eval(this.getAttribute("roles"))) 
                securityguard.addPermission(this.id ? name+this.id : name, role);
            
            this.render(true); 
        }
        
        disconnectedCallback() {
            if (this.id) delete module.elements[this.id];
            else delete module.element;

            delete module.data;
            delete module.datas;
        }

        async attributeChangedCallback(name, oldValue, newValue) {
            if (module.attributeChanged) await module.attributeChanged(this, name, oldValue, newValue);
        }
    });

    // insert into namespace
    window.monkshu_env.components[name] = module;
}

export const monkshu_component = {register}