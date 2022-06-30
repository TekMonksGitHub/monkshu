/**
 * Calls given Java class
 * (C) 2022 TekMonks. All rights reserved.
 * License: See the enclosed LICENSE file.
 */

const util = require("util");
const path = require("path");
const java = require("java");
const Mustache = require("mustache");
const fspromises = require("fs").promises;
const ensureJVMAsync = util.promisify(java.ensureJvm);

const JAVA_CALL_WRAPPER_CLASS = "org.monkshu.java.JavaCallWrapper";

let jvmInitDone = false, compiledCodeFlags = {};

/**
 * Executes the given Java class' execute function. The input to the 
 * class is JsonObject input, and expected output is JsonObject as well. 
 * The method must be named execute.
 * @param {string} classToCall The fully qualified name of the Java class to call
 * @param {object} jsonInput The JSON input to send to the class' execute method
 * @param {string} code The .Java code file, optional, if not provided then classpath
 *                      should contain the classToCall
 * @returns {object} The result as a JSON object.
 */
exports.execute = async (classToCall, jsonInput, code) => {
    try {
        if (code && (!await this.compileJava(code))) {
            LOG.error("Can't perform Java call. Dynamic compile failed. For "+classToCall);
            return CONSTANTS.FALSE_RESULT;
        }

        const callWrapper = await this.newInstance(JAVA_CALL_WRAPPER_CLASS), strInput = JSON.stringify(jsonInput);
        const result = await _executeCallWrapper(callWrapper, classToCall, strInput);

        return JSON.parse(result);
    } catch (err) {
        LOG.error(`Error executing Java call for ${classToCall}. Error is ${err}`);
        return CONSTANTS.FALSE_RESULT;
    }
}

/**
 * Compiles the given .Java file
 * @param {string} pathToJava Path to the Java file to compile.
 * @returns true on success, and false on failure. 
 */
exports.compileJava = async pathToJava => {
    const javaToUse = await this.getJava();

    return new Promise(resolve => {
        if (compiledCodeFlags[pathToJava]) resolve(compiledCodeFlags[pathToJava]);
        const jvmClassPath = java.classpath.join(process.platform == "win32"?";":":");
        javaToUse.callStaticMethod("org.monkshu.java.JavaCompiler", "compile", pathToJava, jvmClassPath, (err, result) => {
            if (err) result = false; compiledCodeFlags[pathToJava] = result; resolve(result);
        });
    });
}

/**
 * Returns the instance of the JVM. Call this method to avoid multiple JVMs.
 * @returns Initialized JVM
 */
exports.getJava = async _ => {
    if (!jvmInitDone) {await _initJVM(); jvmInitDone = true; await ensureJVMAsync();};
    return java;
}

/**
 * Creates a new object instance of the given class 
 * @param {string} javaClassName The fully qualified class name
 * @param {array} args The arguments to the constructor
 * @returns The object instance created
 */
exports.newInstance = async function (javaClassName, args) {
    const javaToUse = await this.getJava();

    return new Promise((resolve, reject) => {
        if (args) javaToUse.newInstance(javaClassName, args, (err, object) => { if (err) reject(err); else resolve(object); });
        else javaToUse.newInstance(javaClassName, (err, object) => { if (err) reject(err); else resolve(object); });
    });
}

const _executeCallWrapper = (callWrapper, classToCall, strInput) => new Promise((resolve, reject) => 
    callWrapper.execute(classToCall, strInput, (err, result) => {if (err) reject(err); else resolve(result);} ));

async function _initJVM() {
    const _toPOSIXPath = pathin => pathin.split(path.sep).join(path.posix.sep)

    const javaConf = Mustache.render(await fspromises.readFile(`${CONSTANTS.CONFDIR}/java.json`, "utf8"),
        {server: _toPOSIXPath(CONSTANTS.ROOTDIR)});
    java.classpath.push(...JSON.parse(javaConf).classpath);
}