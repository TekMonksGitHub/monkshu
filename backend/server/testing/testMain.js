/**
 * Tests the vector DB and algorithms within it.
 * 
 * (C) 2023 Tekmonks. All rights reserved.
 */

const fs = require("fs");
const path = require("path");
const SERVER_ROOT = path.resolve(`${__dirname}/../../../server`);

function runTestsSync(argv) {
    const allfiles = fs.readdirSync(__dirname);
    for (const fileEntry of allfiles) 
        if (fileEntry.toLowerCase().startsWith("test") && fileEntry.toLowerCase().endsWith(".js")  && 
                (fileEntry != path.basename(__filename)))
            require(`${__dirname}/${fileEntry}`).runTestsSync(argv);
}

function setupServerEnvironmentForTesting() {
    global.CONSTANTS = require(SERVER_ROOT + "/lib/constants.js");
    const conf = require(`${CONSTANTS.CONFDIR}/server.json`);
    
	/* Init - Server bootup */
	console.log("Starting...");

	/* Init the logs */
	console.log("Initializing the logs.");
	require(CONSTANTS.LIBDIR+"/log.js").initGlobalLoggerSync(`${CONSTANTS.LOGDIR}/${conf.logfile}`);
	LOG.overrideConsole();

	/* Warn if in debug mode */
	if (conf.debug_mode) {
		LOG.warn("**** Server is in debug mode, expect severe performance degradation.");
		LOG.console("**** Server is in debug mode, expect severe performance degradation.\n");
	}

	/* Init the cluster memory */
	LOG.info("Initializing the cluster memory.");
	require(CONSTANTS.LIBDIR+"/clustermemory.js").init();
	
	/* Start the network check service */
	LOG.info("Initializing the network checker.")
	require(CONSTANTS.LIBDIR+"/netcheck.js").init();

	/* Start the queue executor */
	LOG.info("Initializing the queue executor.");
	require(CONSTANTS.LIBDIR+"/queueExecutor.js").init();

	/* Init the list of apps */
	LOG.info("Initializing the apps list.");
	require(CONSTANTS.LIBDIR+"/app.js").initSync();

	/* Init the API registry */
	const apireg = require(CONSTANTS.LIBDIR+"/apiregistry.js");
	LOG.info("Initializing the API registry.");
	apireg.initSync();

	/* Init the built in blackboard server */
	LOG.info("Initializing the distributed blackboard.");
	require(CONSTANTS.LIBDIR+"/blackboard.js").init();
}

function main(argv) {
    setupServerEnvironmentForTesting();    // init the server environment only

    runTestsSync(argv); // run the tests

    exit(); // exit
}

const exit = _ => process.exit(0);


if (require.main === module) main(process.argv.slice(2));