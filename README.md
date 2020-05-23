# monkshu
The Monkshu Project

Monkshu - The HTML5/REST/JSON/Node.js/API Enterprise Application Server - JAMStack Compliant
=============================================================================================
A complete Enterprise Application Server for Mobile apps (iOS and Android), Responsive HTML 5 Apps, and JSON API services. Consists of web container (called frontend), JSON API container (called backend), and hybrid iOS and Android app frameworks. 

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
 
Fully Secure Backend APIs and Frontend Web Apps
================================================
JWT tokens and API keys are supported natively with a built in API Manager. Don't get hacked! API attacks now comprise 20% of all cyberattacks. Monkshu makes it easy to write 100% secure Web applications and APIs.

Cookieless HTML5 sessions on Frontend, defeat all cross-site and cookie based attacks.

NPMs needed
===========
(1) None if using custom authentication.  
(2) sqlite3 and bcryptjs if using sample authentication based on SQLite3 and Bcrypt algorithms.

License
==========
See enclosed file LICENSE. (C) TekMonks.
