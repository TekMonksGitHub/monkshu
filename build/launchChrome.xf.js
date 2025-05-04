/**
 * XForge Build file for running Chrome. Duplicate's VS-Code task for the same.
 */

const path = require("path");
const {os_cmd} = require(`${CONSTANTS.EXTDIR}/os_cmd.js`);

const workspaceFolder = path.resolve(`${__dirname}/../`);
const LOCAL_IP = require(`${workspaceFolder}/backend/server/lib/utils.js`).getLocalIPs(true)[0]||"127.0.0.1";

// build
exports.make = async function(chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        url=`https://${LOCAL_IP}/`) {
    try {
        // Real Delete Chrome Profile
        await os_cmd(`rm -rf '${workspaceFolder}/.chrome'`);

        // Launch Frontend SSL
        await os_cmd(`"${chrome}" "--media-cache-size=1" "--disk-cache-size=1" "--preserve-symlinks" "--ignore-certificate-errors" "--user-data-dir=${workspaceFolder}/.chrome" "--no-default-browser-check" "--no-first-run" ${url}`);

        CONSTANTS.LOGSUCCESS();
    } catch (err) {
        CONSTANTS.LOGHELP("Build command format: xforge -c -f launchChrome.xf.js -o chrome_path [-o URL to browse]")
        return CONSTANTS.HANDLE_BUILD_ERROR(err);
    }
}