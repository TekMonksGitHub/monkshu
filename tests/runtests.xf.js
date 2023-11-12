/**
 * XForge Build file for Monkshu app tests
 */
const fspromises = require("fs").promises;

const MAIN_TEST_FILE_RELATIVE_PATH = "tests/testMain.js", DEFAULT_APP = "default_app";

// build
exports.make = async function() {
    try {
        const testFile = _getTestFile(arguments[0]); if (!testFile) return CONSTANTS.LOGSUCCESS();

        const returnCode = require(testFile).testMain(arguments.slice(1));

        if (returnCode == 0) CONSTANTS.LOGSUCCESS();
        else CONSTANTS.LOGFAILURE();
    } catch (err) {
        CONSTANTS.LOGHELP("Command format: xforge -c -f runtests.xf.js <-o appName> [-o command line arguments]")
        return CONSTANTS.HANDLE_BUILD_ERROR(err);
    }
}

async function _getTestFile(appName) {
    const appDirContents = fs.readdirSync(`${__dirname}/../backend/apps`);
    if (!appDirContents?.length) return; if (appName == DEFAULT_APP) appName = appDirContents[0];
    for (app of appDirContents) if (appName && (appName.toLowerCase()==app.toLowerCase()))
        if (fspromises.access(`${__dirname}/../backend/apps/${app}/${MAIN_TEST_FILE_RELATIVE_PATH}`)) return `${__dirname}/../backend/apps/${app}/${MAIN_TEST_FILE_RELATIVE_PATH}`;
    else return null;
}