/** 
 * Get process args as a JSON object. On windows the arg name 
 * flag is '/' or '-' and on *nix it is the '-' character. 
 * E.g. the following 
 * Unix/Linux: <program name> -c config_option -o test 
 * Windows: <program name> /c config_option /o test 
 * Both produce {"c": ["config_option"], "o": ["test"]}
 * 
 * (C) 2021 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */

let args;

/**
 * @param {Object} propMap The map of properties to expect, named and required.
 * @returns The process args as a key-value pair object. All values are arrays.
 */
function getArgs(propMap) {
    if (args) return args; else args = {};

    const _getArgsKey = argOption => 
        propMap && propMap[argOption] ? propMap[argOption].long||propMap[argOption] : argOption;

    const argv = process.argv.slice(2);
    let currKey; for (const arg of argv) {
        if (arg.startsWith("-")||(process.platform=="win32" && arg.startsWith("/"))||(arg.startsWith("--"))) {
            currKey = _getArgsKey(arg.substring(arg.startsWith("--")?2:1)); args[currKey] = args[currKey]||[];
        } else if (currKey) args[currKey].push(arg);
    }

    const errorKeys = [];
    if (propMap) for (const key of Object.keys(propMap)) if (propMap[key].required && args[_getArgsKey(key)] && 
        (!args[_getArgsKey(key)].length)) errorKeys.push(key);

    if (errorKeys.length) {
        console.error(propMap.description||"");
        for (const errorKey of errorKeys) console.error(`${errorKey}: ${propMap[errorKey].help||`Missing value for ${errorKey}.`}`);
        return null;
    } else return args;
}

module.exports = {getArgs, reset: _=>args=undefined};

if (require.main === module) {
    console.log(getArgs()); module.exports.reset();
    console.log(getArgs({"c": "color", "f": {long: "file", required: true, help: "Filepath. The value is required if specified."}})||"Error in the input arguments.");
}