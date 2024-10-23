/**
 * Tests the create and operate's write algorithms.
 * 
 * (C) 2023 Tekmonks. All rights reserved.
 */
const utils = require(`${CONSTANTS.LIBDIR}/utils.js`);
const distributedjobhandler = require(`${CONSTANTS.LIBDIR}/distributedjobhandler.js`);

exports.runTestsAsync = async function(argv) {
    if ((!argv[0]) || (argv[0].toLowerCase() != "distributed_job")) {
        LOG.console(`Skipping distributed job handler test case, not called.\n`)
        return;
    }
    if (!argv[1]) LOG.console("Using defaults, as no arguments were provided.\n"); 
    const jobfunction = _ => {
        const message = argv[1]?`[PID: ${process.pid}]${argv[1]}`:`Hello from process ID ${process.pid}`;
        LOG.console(message);
        return message;
    }
    const result = await distributedjobhandler.runJob(utils.generateUUID(false), jobfunction, distributedjobhandler.LOCAL_CLUSTER);
    LOG.console(`\nJob result is ${result}\n`);
    return true;
}
