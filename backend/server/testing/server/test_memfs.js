/**
 * Tests the memfs filesystem.
 * 
 * (C) 2023 Tekmonks. All rights reserved.
 */
const memfs = require(`${CONSTANTS.LIBDIR}/memfs.js`);

const memfsOps = ["readFile", "writeFile", "appendFile", "unlink", "unlinkIfExists", "readdir", "mkdir", 
    "rmdir", "access", "rm", "flush", "stat"];
const writtenFiles = [], writtenDirs = [];

exports.runTestsAsync = async function(argv) {
    if ((!argv[0]) || (argv[0].toLowerCase() != "memfs")) {
        LOG.console(`Skipping memfs test case, not called.\n`)
        return;
    }

    if (!argv[1]) LOG.console("Using defaults, as no arguments were provided.\n"); 
    if (!argv[1]) LOG.console("Usage: minimum length, maximum length, operations to simulate, working directory\n"); 

    let [minLength, maxLength, fsOpsToSimulate, workingDir] = argv.slice(1, argv.length);
    minLength = minLength || 100; maxLength = maxLength || 1000; fsOpsToSimulate = fsOpsToSimulate || 100; 
    workingDir = workingDir || `${__dirname}/memfs`;

    LOG.console(`Creating working directory\n\n`);
    await memfs.mkdir(workingDir, {recursive: true});

    for (let i = 0; i < fsOpsToSimulate; i++) {
        const opToDo = _getRandomForArray(memfsOps);
        if (opToDo == "writeFile" || opToDo == "appendFile") {  // writing a file
            const randomFileName = `${workingDir}/${_generateRandomText(4,8)}.txt`; 
            writtenFiles.push(randomFileName);
            await _performOp(opToDo, randomFileName, _generateRandomText(minLength, maxLength), "utf8");
        } else if (opToDo == "readFile" || opToDo == "unlink" || opToDo == "unlinkIfExists" || opToDo == "access" || 
                opToDo == "rm" || opToDo == "stat") {

            if (!writtenFiles.length) {LOG.console(`Skipping op ${opToDo} as no file exists.\n`); continue;};
            const fileName = _getRandomForArray(writtenFiles);
            await _performOp(opToDo, fileName);
            if (opToDo == "unlink" || opToDo == "unlinkIfExists" || opToDo == "rm") _deleteFromArray(writtenFiles, fileName);
        } else {    // readdir, mkdir, rmdir
            if (opToDo == "mkdir") {
                const randomDirName = `${workingDir}/${_generateRandomText(4,8)}`;
                await _performOp("mkdir", randomDirName);
                writtenDirs.push(randomDirName);
            } else if (opToDo == "rmdir") {
                if (!writtenDirs.length) {LOG.console(`Skipping op ${opToDo} as no dir exists.\n`); continue;};
                const dirName = _getRandomForArray(writtenDirs);
                await _performOp(opToDo, dirName);
                if (opToDo == "rmdir") _deleteFromArray(writtenDirs, dirName);
            } else if (opToDo == "readdir") await _performOp(opToDo, workingDir);   // readdir for working dir only
        }
    }

    await _testRecursiveDelete(workingDir);

    await _testReadDeleteAppendSquence(workingDir);

    await memfs.flush();  // finally flush

    LOG.console(`\n\nEnd\nFiles that should exist: ${writtenFiles}\n`);
    LOG.console(`Directories that should exist: ${writtenDirs}\n`);

    return true;
}

async function _testRecursiveDelete(workingDir) {
    LOG.console("\nRecursive deletion test begins.\n")
    const dirToMake1 = `${workingDir}/recursive`, dirToMake2 = `${dirToMake1}/nested`;
    await _performOp("mkdir", dirToMake1, {recursive: true});
    await _performOp("writeFile", `${dirToMake1}/1.txt`, "Test file 1");
    await _performOp("writeFile", `${dirToMake1}/2.txt`, "Test file 2");
    await _performOp("mkdir", dirToMake2);
    await _performOp("writeFile", `${dirToMake2}/1.txt`, "Nested file 1");
    await _performOp("writeFile", `${dirToMake2}/2.txt`, "Nested file 2");
    await _readAndPrintFile(`${dirToMake1}/1.txt`);
    await _readAndPrintFile(`${dirToMake2}/2.txt`);

    LOG.console("\nTesting cache hits, read ops below must respond from the cache.\n")
    await _readAndPrintFile(`${dirToMake1}/1.txt`);
    await _readAndPrintFile(`${dirToMake2}/2.txt`);

    await _performOp("rm", dirToMake1, {recursive: true, force: true});
}

async function _testReadDeleteAppendSquence(workingDir) {
    LOG.console("\nRead delete append sequence test begins.\n")
    const dirToMake = `${workingDir}/readdeleteappendseq`;
    await _performOp("mkdir", dirToMake, {recursive: true});
    await _performOp("writeFile", `${dirToMake}/1.txt`, "Test file 1");
    await _readAndPrintFile(`${dirToMake}/1.txt`);
    await _performOp("rm", `${dirToMake}/1.txt`);
    await _performOp("appendFile", `${dirToMake}/1.txt`, "\nAdded more text to file 1.");

    LOG.console("\nTesting cache hits, read ops below must respond from the cache.\n")
    await _readAndPrintFile(`${dirToMake}/1.txt`);

    LOG.console(`\nCleaning up ${dirToMake}.\n`);
    await _performOp("rm", dirToMake, {recursive: true, force: true});
}

async function _readAndPrintFile(path) {
    const contents = (await _performOp("readFile", path)).toString('utf8');
    await LOG.console((contents||`Error reading: ${path}`)+"\n");
}

async function _performOp() {
    const opName = arguments[0], opArgs = [...arguments].slice(1);
    LOG.console(`Performing memfs op ${opName} with file path ${opArgs[0]}\n`);
    try {
        const result = await memfs[opName](...opArgs);
        LOG.console(`Result of op ${opName} on file path ${opArgs[0]} is ${result ? 
            (typeof result == "string" || Buffer.isBuffer(result)?result.toString("utf8"):JSON.stringify(result)) :
            "undefined"}\n`);
        return result;
    } catch (err) {
         LOG.console(`Result of op ${opName} on file path ${opArgs[0]} is an error ${err}\n`);
         return null;
    }
}

function _getRandomForArray(arrayIn) {return arrayIn[Math.floor(arrayIn.length*Math.random())];}
function _deleteFromArray(arrayIn, element) {if (arrayIn.indexOf(element) != -1) arrayIn.splice(arrayIn.indexOf(element), 1);}

function _generateRandomText(minLength, maxLength) {
    const textLength = minLength + (maxLength - minLength)*Math.random(), arrayRange = Array(26), keys = [...arrayRange.keys()];
    const charArray = [...keys.map(key => String.fromCharCode('A'.charCodeAt(0)+key)),
        ...keys.map(key => String.fromCharCode('a'.charCodeAt(0)+key))];
    let retString=""; for (let i = 0; i < textLength; i++) retString = retString+_getRandomForArray(charArray);
    return retString;
}
