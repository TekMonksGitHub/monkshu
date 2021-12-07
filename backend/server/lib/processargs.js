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
 * @returns The process args as a key-value pair object. All values are arrays.
 */
function getArgs() {
    if (args) return args; else args = {};

    const argv = process.argv.slice(2);
    let currKey; for (const arg of argv) {
        if (arg.startsWith("-")||(process.platform=="win32" && arg.startsWith("/"))) {
            currKey = arg.substring(1); args[currKey] = args[currKey]||[];
        } else if (currKey) args[currKey].push(arg);
    }

    return args;
}

module.exports = {getArgs};