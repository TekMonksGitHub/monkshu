/**
 * XForge Build file for Monkshu native apps
 */
const fs = require("fs");
const path = require("path");
const mustache = require("mustache");
const {os_cmd} = require(`${CONSTANTS.EXTDIR}/os_cmd.js`);

const MONKSHU_DESKTOP_PATH = path.resolve(`${__dirname}/../desktop`), MONKSHU_BUILD_PATH = path.resolve(__dirname);

// build
exports.make = async function(output_dir, monkshuAppName) {
    try {
        if (!monkshuAppName) monkshuAppName = _getMonkshuAppNameSync(); 
        if (!output_dir) output_dir = path.resolve(MONKSHU_BUILD_PATH+"/dist");

        // generate package.json for build
        const packageJSON = fs.readFileSync(`${MONKSHU_BUILD_PATH}/package_for_desktop_build.json`, "utf8");
        const appData = require(`${MONKSHU_DESKTOP_PATH}/app/${monkshuAppName}/conf/application.json`);
        let rendered = mustache.render(packageJSON, appData); rendered = rendered.replace("monkshunative", appData.monkshuappname);
        fs.writeFileSync(`${MONKSHU_DESKTOP_PATH}/package.json`, rendered, "utf8");

        // build it now
        let buildCmd = path.resolve(`${MONKSHU_DESKTOP_PATH}/../node_modules/.bin/electron-builder` + (process.platform == "win32" ? ".cmd" : ""));
        buildCmd += ` --projectDir ${MONKSHU_DESKTOP_PATH}`;
        await os_cmd(buildCmd, true);

        // move to the output directory, if given
        if (await CONSTANTS.SHELL.test("-e", `${output_dir}/dist`)) await CONSTANTS.SHELL.rm("-rf", `${output_dir}/dist`);
        if (output_dir && (await CONSTANTS.SHELL.mv(`${MONKSHU_DESKTOP_PATH}/dist`, output_dir)).code != 0)
            CONSTANTS.HANDLE_BUILD_ERROR("Unable to move the generated binaries.")

        // cleanup
        if (await CONSTANTS.SHELL.test("-e", `${MONKSHU_DESKTOP_PATH}/package.json`)) await CONSTANTS.SHELL.rm(`${MONKSHU_DESKTOP_PATH}/package.json`); 
        if (await CONSTANTS.SHELL.test("-e", `${MONKSHU_DESKTOP_PATH}/package-lock.json`)) await CONSTANTS.SHELL.rm(`${MONKSHU_DESKTOP_PATH}/package-lock.json`); 
        if (await CONSTANTS.SHELL.test("-e", `${MONKSHU_DESKTOP_PATH}/node_modules`)) await CONSTANTS.SHELL.rm("-rf", `${MONKSHU_DESKTOP_PATH}/node_modules`); 

        CONSTANTS.LOGSUCCESS();
    } catch (err) {
        CONSTANTS.LOGHELP("Build command format: xforge -c -f buildApp.xf.js -o monkshu_app_name [-o output_dir]")
        return CONSTANTS.HANDLE_BUILD_ERROR(err);
    }
}

function _getMonkshuAppNameSync() {
    const appDirContents = fs.readdirSync(`${MONKSHU_DESKTOP_PATH}/app`);
    if (appDirContents && appDirContents[0]) return appDirContents[0];
    else throw "No app found.";
}