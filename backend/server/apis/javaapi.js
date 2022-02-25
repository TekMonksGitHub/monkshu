/**
 * Calls Java API. 
 * (C) 2022 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */
const util = require("util");
const path = require("path");
const java = require("java");
const Mustache = require("mustache");
const fspromises = require("fs").promises;
const ensureJVMAsync = util.promisify(java.ensureJvm);

const API_WRAPPER_CLASS = "org.monkshu.java.APIWrapper";

let jvmInitDone = false, compiledCodeFlags = {};

exports.doService = async (jsonReq, _servObject, headers, url, apiconf) => {
    if (!jvmInitDone) {await _initJVM(apiconf); jvmInitDone = true; await ensureJVMAsync();}

    try {
        if (!apiconf.entrypoint) {
            LOG.error("Can't call Java API. Missing entrypoint parameter.");
            return CONSTANTS.FALSE_RESULT;
        }
        if (apiconf.code && (!await _compileJava(apiconf.code))) {
            LOG.error("Can't call Java API. Dynamic API compile failed.");
            return CONSTANTS.FALSE_RESULT;
        }

        const apiWrapper = await _newInstance(API_WRAPPER_CLASS), strReq = JSON.stringify(jsonReq), 
            strHeaders = JSON.stringify(headers), strAPIConf = JSON.stringify(apiconf);
        const result = await callAPIWrapper(apiWrapper, apiconf.entrypoint, strReq, strHeaders, url, strAPIConf);

        return JSON.parse(result);
    } catch (err) {
        LOG.error("Error calling Java API. Error is "+err);
        return CONSTANTS.FALSE_RESULT;
    }
}

const callAPIWrapper = (apiWrapper, apiClass, strReq, strHeaders, url, strAPIConf) => new Promise((resolve, reject) => 
    apiWrapper.doService(apiClass, strReq, strHeaders, url, strAPIConf, (err, result) => {if (err) reject(err); else resolve(result);} ));

const _compileJava = async pathToJava => {
    return new Promise(resolve => {
        if (compiledCodeFlags[pathToJava]) resolve(compiledCodeFlags[pathToJava]);
        const jvmClassPath = java.classpath.join(process.platform == "win32"?";":":");
        java.callStaticMethod("org.monkshu.java.JavaCompiler", "compile", pathToJava, jvmClassPath, (err, result) => {
            if (err) result = false; compiledCodeFlags[pathToJava] = result; resolve(result);
        });
    });
    
}

async function _initJVM(apiconf) {
    const _toPOSIXPath = pathin => pathin.split(path.sep).join(path.posix.sep)

    const javaConf = Mustache.render(await fspromises.readFile(`${CONSTANTS.CONFDIR}/java.json`, "utf8"),
        {server: _toPOSIXPath(CONSTANTS.ROOTDIR), ...apiconf});
    java.classpath.push(...JSON.parse(javaConf).classpath);
}

async function _newInstance(javaClassName, args) {
    return new Promise((resolve, reject) => {
        if (args) java.newInstance(javaClassName, args, (err, object) => { if (err) reject(err); else resolve(object); });
        else java.newInstance(javaClassName, (err, object) => { if (err) reject(err); else resolve(object); });
    });
}