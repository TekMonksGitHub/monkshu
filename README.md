# Monkshu - The Monkshu Project
<p align="center"><img src="https://github.com/TekMonksGitHub/monkshu/blob/master/frontend/framework/img/logo_512.png?raw=true"></p>

Monkshu - The Modern Enterprise Application Server - JAMStack Compliant
=============================================================================================
A complete Javascript based Enterprise Application Server for Mobile apps (iOS and Android), PWA applications, Responsive HTML 5 Web Apps, Electron based native desktop apps and JSON API services. Consists of web container (called frontend), JSON API container (called backend), and hybrid iOS and Android app frameworks. 

Monkshu is 100% compliant with [JAMStack](https://jamstack.org) standards for modern web development. 

Fully independent - Monkshu is built ground up to not require any other dependencies other than base Node.js. Includes embedded HTTP servers as well.

## Monkshu's JAMStack
* Javascript - Monkshu frontend is simple ES6 JS modules  
* Api - Monkshu Backend is a feature rich and easy to use API framework  
* Markup - Monkshu uses WebComponents and Mustache templates for easy HTML Markup  

The plan is to produce a full Enterprise Application Sever based on Node.js, HTML5, Javascript, Android and iOS apps.

Single unified codebase, with minimum external dependencies - currently the only real major dependency is Mustache for HTML5 templating.

HTML5 + Node.js + REST + Mobile (Android/iOS) + Database (MySQL, Oracle, etc.) + Globalization (i18n) support.

Cookieless sessions supported out of the box.

Mustache.js logicless templates used, as they work with JSON objects to inflate views in a non-complicated manner,
and also allow full HTML5+CSS3 design capabilites instead of coming up with a more complicated widget framework.

* Full support for Web Components, out of the box. https://developer.mozilla.org/en-US/docs/Web/Web_Components
* Full support for ECMA 6 standards
* Full support for REST API based backend
* Unified server - API runtime plus HTML5 Web Component frontend.
  
Everything in a single box
==========================
HTTP and API servers are built into Monkshu. No need to install any external HTTP servers or components. Allows for easier setup, and end to end control over the web applications. 

Electron build framework for native applications is built in as well.

Support for PWAs out of the box.

Web Component Ready
===================
100% standards compliant support for Web Components. Doesn't introduce yet another custom, non-W3C compliant, web component framework. Monkshu's implementation of web components is fully standards compliant, supported by all modern web browsers, and doesn't require one to learn new technologies beyond standard HTML, CSS and Javascript. 

 
Fully Secure Backend APIs and Frontend Web Apps
================================================
JWT tokens and API keys are supported natively with a built in API Manager. Don't get hacked! API attacks now comprise 20% of all cyberattacks. Monkshu makes it easy to write 100% secure Web applications and APIs.

Cookieless HTML5 sessions on Frontend, defeat all cross-site and cookie based attacks.

Built in blacklist and whitelist support for the frontend and backend HTTP servers. 

Build Internet Scale Applications
==================================
Monkshu includes a global distributed memory framework, which allows building SAAS applications that scale as wide as the Internet, with a distributed memory that spans clusters, countries, multiple clould providers and data centers. You can now easily buid applications at the same global scale as Facebook or Google. 

There is also a global event management system using a Publish/Subscribe global dashboard, running on top the global distribued memory.

NPMs needed
===========
We strive to minimize the use of external libraries. This keeps Monkshu secure, and also independent. Only Mustache for the out of the box deployment.

Documentation
===========
Wiki link -> [https://github.com/TekMonksGitHub/monkshu/wiki](https://github.com/TekMonksGitHub/monkshu/wiki)

License
==========
See enclosed file LICENSE. (C) TekMonks.
