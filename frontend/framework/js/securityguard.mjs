/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import {session} from "/framework/js/session.mjs";

let _PERMISSIONS_MAP = session.get("_com_monkshu_securityguard_permissions_map") || {};
let _app_interceptor = session.get("_com_monkshu_securityguard_app_interceptor");
let _current_role  = session.get("_com_monkshu_securityguard_current_role");

function isAllowed(resource, role=_current_role) {
    if (_app_interceptor) return _app_interceptor.isAllowed(resource, role);
    else if (!role) return false;
    else return _PERMISSIONS_MAP[role]?.includes(resource) ||  _PERMISSIONS_MAP[role] == "*";
}

function setAppInterceptor(interceptor) {
    _app_interceptor = interceptor; 
    session.set("_com_monkshu_securityguard_app_interceptor", interceptor)
}
function getAppInterceptor() {return _app_interceptor}

function setPermissionsMap(map) {
    _PERMISSIONS_MAP = map;
    session.set("_com_monkshu_securityguard_permissions_map", map);
}
function getPermissionsMap() {return _PERMISSIONS_MAP}

function setCurrentRole(role) {
    _current_role = role;
    session.set("_com_monkshu_securityguard_current_role", role)
}
function getCurrentRole() {return _current_role}

function addPermission(resource, role) {
    if (_PERMISSIONS_MAP[role] && !_PERMISSIONS_MAP[role].includes(resource)) _PERMISSIONS_MAP[role].push(resource);
    session.set("_com_monkshu_securityguard_permissions_map", _PERMISSIONS_MAP);
}

export const securityguard = {isAllowed, setAppInterceptor, getAppInterceptor, setPermissionsMap, getPermissionsMap, 
    setCurrentRole, getCurrentRole, addPermission};