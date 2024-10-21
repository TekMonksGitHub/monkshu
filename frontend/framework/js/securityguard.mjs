/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

import {router} from "/framework/js/router.mjs";
import {session} from "/framework/js/session.mjs";

let _PERMISSIONS_MAP = session.get("_com_monkshu_securityguard_permissions_map") || {};
let _app_interceptor = session.get("_com_monkshu_securityguard_app_interceptor");
let _current_role  = session.get("_com_monkshu_securityguard_current_role");

function isAllowed(resource, role=_current_role) {
    if (_app_interceptor) return _app_interceptor.isAllowed(resource, role);

    else if ((!role) || (!_PERMISSIONS_MAP[role])) return false;
    else return _PERMISSIONS_MAP[role].some(path => _doesResourceMatchPermissionPath(resource, path));
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

function _doesResourceMatchPermissionPath(resource, permissionpath) {
    if (resource == permissionpath) return true;    // definitely match else try router for LB URLs
    else if (router.doURLsMatch(permissionpath, resource)) return true;
    
    // now check via the RE route if it contains an RE - to indicate that it must have a * or +
    if (permissionpath.indexOf("+") == -1 && permissionpath.indexOf("*") == -1) return false;
    const regExpObj = new RegExp(permissionpath), regexpMatch = resource.match(regExpObj) ? true : false, 
        routerMatch = regexpMatch ? true : router.doURLsMatch(permissionpath, resource, true);
    return regexpMatch || routerMatch;
}

export const securityguard = {isAllowed, setAppInterceptor, getAppInterceptor, setPermissionsMap, getPermissionsMap, 
    setCurrentRole, getCurrentRole, addPermission};