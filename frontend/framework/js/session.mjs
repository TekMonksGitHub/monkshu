/* 
 * (C) 2018 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

////////////////////////////////////////////////
// Cookieless HTML5 Session Support
////////////////////////////////////////////////    

const set = (key, item) => sessionStorage.setItem(key, item ? JSON.stringify(item) : null);
const get = key => sessionStorage.getItem(key) ? JSON.parse(sessionStorage.getItem(key)) : null;
const remove = key => sessionStorage.removeItem(key);
const destroy = _ => sessionStorage.clear();
const contains = key => get(key)!=null;
const keys = _ => Object.keys(sessionStorage);

export const session = {set, get, remove, destroy, contains, keys};