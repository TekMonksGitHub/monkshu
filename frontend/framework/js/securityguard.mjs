/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

let _PERMISSIONS_MAP = {};
let _app_interceptor;
let _current_role;

function isAllowed(resource) {
    if (_app_interceptor) return _app_interceptor.isAllowed(resource);
    else if (!_current_role) return false;
    else return _PERMISSIONS_MAP[_current_role] ? _PERMISSIONS_MAP[_current_role].includes(resource) : false;
}

function setAppInterceptor(interceptor) {_app_interceptor = interceptor}
function getAppInterceptor() {return _app_interceptor}

function setPermissionsMap(map) {_PERMISSIONS_MAP = map}
function getPermissionsMap() {return _PERMISSIONS_MAP}

function setCurrentRole(role) {_current_role = role}
function getCurrentRole() {return _current_role}

function addPermission(resource, role) {
    if (_PERMISSIONS_MAP[role] && !_PERMISSIONS_MAP[role].includes(resource)) _PERMISSIONS_MAP[role].push(resource);
}

export const securityguard = {isAllowed, setAppInterceptor, getAppInterceptor, setPermissionsMap, getPermissionsMap, 
    setCurrentRole, getCurrentRole, addPermission};