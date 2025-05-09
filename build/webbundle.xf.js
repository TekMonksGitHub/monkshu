/**
 * XForge Build file to build a web bundle for a given app
 */
const fs = require("fs");
const path = require("path");
const terser = require("terser");
const MONKSHU_PATH = path.resolve(`${__dirname}/../`);
const DEFAULT_APP_NAME = _resolveDefaultAppNameSync();
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);

const DEFAULT_WEBUNDLE_FILE_PATTERNS = ["**/*.mjs", "**/*.js", "**/*.html", "**/*.css", "**/*.json"];
const MINIMIZABLE_FILE_EXTENSIONS = [".js", ".mjs"];
const DEFAULT_MIMES = {".html": "text/html", ".css": "text/css", ".js": "text/javascript", 
    ".mjs": "text/javascript", ".json": "application/json", ".svg":"image/svg+xml", "*": "text/plain"};
const MIN_EXTENSIONS = [".min"];

let buildconf = {}; 
 
// build
exports.make = async function(appname, webbundlepath, filePatterns) {
    try {
        if ((!appname) || appname.toLowerCase() == "use_default_app") appname = DEFAULT_APP_NAME;
        if (!webbundlepath) webbundlepath = `${MONKSHU_PATH}/frontend/apps/${appname}/webbundle/webbundle.json`;
        const bundlepath = path.resolve(`${path.dirname(webbundlepath)}/../webbundle.conf.json`);
        try {buildconf = require(bundlepath);} catch (err) {
            if ((err.code != "ENOENT") && (err.code != 'MODULE_NOT_FOUND')) {
                CONSTANTS.HANDLE_BUILD_ERROR(`Bad web bundle at ${bundlepath}. Error ${err}`); return; }
        };
        const webbundleRoot = path.dirname(webbundlepath); await _makePathWritable(webbundleRoot);
        await CONSTANTS.SHELL.rm("-rf", webbundleRoot); // clean the webbundle directory
        const webbundleURL = "/"+path.relative(`${MONKSHU_PATH}/frontend`, webbundleRoot);
        if (!filePatterns) filePatterns = buildconf.WEBUNDLE_FILE_PATTERNS||DEFAULT_WEBUNDLE_FILE_PATTERNS;

        const allFilesToBundle = []; for (const filePattern of filePatterns) {
            try {
                const filesFound = utils.findAllFilesSync(`${MONKSHU_PATH}/frontend/framework`, filePattern);
                allFilesToBundle.push(...filesFound);
            } catch (err) { CONSTANTS.LOGWARN(`No matching files found for ${MONKSHU_PATH}/frontend/framework/${filePattern}`)}
            try {
                const filesFound = utils.findAllFilesSync(`${MONKSHU_PATH}/frontend/apps/${appname}`, filePattern);
                allFilesToBundle.push(...filesFound);
            } catch (err) { CONSTANTS.LOGWARN(`No matching files found for ${MONKSHU_PATH}/frontend/apps/${appname}/${filePattern}`)}
        }

        CONSTANTS.LOGINFO(`Bundling files: ${allFilesToBundle}`);
        const webbundleJSON = {};
        for (const file of allFilesToBundle) webbundleJSON[_getPathAsURLKey(file)] = 
            await _bundleFile(file, webbundleRoot, webbundleURL);
        const budleStr = JSON.stringify(webbundleJSON), bundleSize = Buffer.from(budleStr, "utf8").length;
        fs.writeFileSync(webbundlepath, budleStr);

        CONSTANTS.LOGINFO(`Total ${allFilesToBundle.length} files bundled.`);
        CONSTANTS.LOGINFO(`Bundle size is ${bundleSize} bytes or ${Math.round(bundleSize/1024 * 100)/100} KB.`);
        CONSTANTS.LOGSUCCESS();
    } catch (err) { 
        CONSTANTS.LOGHELP("Build command format: xforge -c -f webbundle.xf.js -o [app_name] -o [webbundle path] -o [file patterns to bundle]");
        return CONSTANTS.HANDLE_BUILD_ERROR(err); 
    }
}

async function _bundleFile(filepath, webbundleRoot, webbundleURL) {
    if (!fs.statSync(filepath).isFile()) {CONSTANTS.LOGWARN(`${filepath} is not a file. Skipping from the bundle.`); return;}

    const bodyRaw = fs.readFileSync(filepath, "utf8"),
        mapRootRelative = filepath.substring(`${MONKSHU_PATH}/frontend`.length)+".map",
        mapPath = path.resolve(`${webbundleRoot}/${mapRootRelative}`),
        mapURL = (webbundleURL+"/"+mapRootRelative).replaceAll("//","/"),
        extension = path.extname(filepath).toLowerCase(),
        isMinimizedAlready = _isMimimizedAlready(filepath);
    
    let minified = {}; const MINIMIZABLE_FILE_EXTENSIONS_FINAL = buildconf.MINIMIZABLE_FILE_EXTENSIONS || MINIMIZABLE_FILE_EXTENSIONS;
    if (MINIMIZABLE_FILE_EXTENSIONS_FINAL.includes(extension) && (!isMinimizedAlready)) {
        try {
            minified = await terser.minify(bodyRaw, {mangle: false, sourceMap: {url: mapURL}});
            await _makePathWritable(mapPath); fs.writeFileSync(mapPath, minified.map);
        } catch (err) {
            CONSTANTS.LOGWARN(`terser failed to mimimize ${filepath}, continuing unminimized.`); 
            minified = {code: bodyRaw};
        }
    } else minified = {code: bodyRaw};

    const MIMES_FINAL = {...(buildconf.MIMES || DEFAULT_MIMES), ...(buildconf.ADDITIONAL_MIMES||{})};
    const bundledObject = {body: minified.code, statusText: "ok: webbundle", headers: {
        "server": "Monkshu HTTPD (unix)",
        "content-type": MIMES_FINAL[extension] || MIMES_FINAL["*"],
        "content-length": Buffer.from(minified.code, "utf8").length,
        "content-type": MIMES_FINAL[extension],
        "x-frame-options": "deny",
		"x-content-type-options": "nosniff"
    }};
    CONSTANTS.LOGINFO(`Processed ${filepath}`);
    return bundledObject;
}

function _isMimimizedAlready(filepath) {
    const extension = path.extname(filepath).toLowerCase()
    for (const minExtension of MIN_EXTENSIONS) 
        if (filepath.toLowerCase().endsWith(`${minExtension}${extension}`)) return true;
    return false;
}

async function _makePathWritable(file) {
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), {recursive: true}); 
}

function _resolveDefaultAppNameSync() {
    if (!fs.existsSync(`${MONKSHU_PATH}/frontend/apps`)) return null;
    
    for (const direntry of fs.readdirSync(`${MONKSHU_PATH}/frontend/apps`)) 
        if (fs.statSync(`${MONKSHU_PATH}/frontend/apps/${direntry}`).isDirectory()) return direntry;

    return null;
}

function _getPathAsURLKey(filepath) {
    const monkshuPathResolved = path.resolve(`${MONKSHU_PATH}/frontend`);
    const pathNormalized = path.relative(monkshuPathResolved, filepath).split(path.sep).join(path.posix.sep);
    return "/"+pathNormalized;
}