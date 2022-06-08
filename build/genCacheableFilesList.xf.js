/**
 * XForge Build file to generate a list of cacheable files for web applications
 */
const fs = require("fs");
const path = require("path");
const fspromises = fs.promises;
const APP_ROOT = path.resolve(`${__dirname}/../frontend/apps`);
const FRONTEND_ROOT = path.resolve(`${__dirname}/../frontend`);

// build
exports.make = async function(webroot, out, ...filterPatterns) {
    try {
        if ((!webroot) && (!out) && (!filterPatterns?.length)) {    // assume running as a Monkshu build task
            const builds = [ {webroot: FRONTEND_ROOT, out: path.resolve(`${FRONTEND_ROOT}/framework/conf/cachelist.json`), 
                filterPatterns: ["^server/.*"]} ];
            for (const app of await _getAppRoots()) builds.push( { webroot: path.resolve(`${FRONTEND_ROOT}/apps/${app}`), 
                out: path.resolve(`${APP_ROOT}/${app}/conf/cachelist.json`), filterPatterns:[], 
                pathprefix: `apps/${app}/` } );

            for (const build of builds) await _genList(build.webroot, build.out, build.filterPatterns, build.pathprefix);
        } else await _genList(webroot, out, ...filterPatterns);   // else we need all params to build

        CONSTANTS.LOGSUCCESS();
    } catch (err) { 
        CONSTANTS.LOGHELP("Build command format: xforge -c -f genCacheableFilesList.xf.js -o webroot -o outfile [-o filterPattern1 -o filterPattern2 ... -o filterPatternK]");
        CONSTANTS.LOGHELP("Webroot is the webroot, outfile is the JSON file to write to, and filter pattern, if provided, skips files with names matching the pattern.");
		return CONSTANTS.HANDLE_BUILD_ERROR(err); 
	}
}

async function _genList(webroot, out, filterPatterns, pathprefix) {
    if ((!webroot)||(!out)) throw "Bad incoming arguments."; // check usage

    // normalize paths
    webroot = path.resolve(webroot).split(path.sep).join(path.posix.sep); out = path.resolve(out);
    
    // find all static files and add to the list
    const allFiles = (await CONSTANTS.SHELL.ls("-Rl",webroot));

    const cacheableFiles = allFiles.filter(fileStat=>fileStat.isFile() && (filterPatterns?_dontFilterFile(filterPatterns, fileStat.name):true)).map(fileStat => (pathprefix||"")+fileStat.name);
    await fspromises.writeFile(out, JSON.stringify(cacheableFiles, null, 4));
}

function _dontFilterFile(filterPatterns, name) {
    for (const filterPattern of filterPatterns) if (name.match(filterPattern)) return false;
    return true;
}

async function _getAppRoots() {
    const appDirContents = await fspromises.readdir(APP_ROOT);
    const roots = []; if (appDirContents) for (const appName of appDirContents) try {
        await fspromises.access(`${APP_ROOT}/${appName}/conf/webmanifest.json`, fs.constants.R_OK);
        roots.push(appName);
    } catch (err) {
        CONSTANTS.LOGWARN(`Skipping app ${appName}, missing webmanifest.json`);
    }
    return roots;
}