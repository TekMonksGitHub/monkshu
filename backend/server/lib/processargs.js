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
 * Prints help usage.
 * @param {Object} propMap The arg property map
 * @param {Array} errorKeys In case of errors, the error keys in the prop map above
 */
function printHelp(propMap, errorKeys) {
    if (!propMap || (!Object.keys(propMap).length)) return;

    const consoleOut = errorKeys ? console.error : console.log;
    if (propMap.__description) consoleOut(propMap.__description);
    let usage = `Usage: ${process.argv[1]} `; for (const [key, value] of Object.entries(propMap)) 
        if (key.startsWith("__")) continue; else usage += `[-${key}${value.long?`, --${value.long}`:""}] `;
    consoleOut(usage);
    for (const [key, value] of Object.entries(propMap)) if (((errorKeys && errorKeys.includes(key)) || (!errorKeys)) && 
        value.help) consoleOut(`    -${key}${value.long?`, --${value.long}`:""}: ${value.help}`);
}

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

    if (errorKeys.length) { printHelp(propMap, errorKeys); return null;} else return args;
}

module.exports = {getArgs, printHelp, reset: _=>args=undefined};

if (require.main === module) {
    const propMap = { "__description": "\nTest program. (C) 2022 Tekmonks.",
        "c": "color", 
        "f": {long: "file", required: true, help: "Filepath. The value is required if specified."},
        "u": {long: "user", required: true, help: "User ID. The value is required if specified."} };

    console.log(getArgs()); module.exports.reset();
    console.log(getArgs(propMap)||"\nError in the input arguments.");
    printHelp(propMap);
}