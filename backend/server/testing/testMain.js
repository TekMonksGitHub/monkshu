/**
 * Runs embedded app's test cases.
 * 
 * (C) 2023 Tekmonks. All rights reserved.
 */

const fs = require("fs");
const path = require("path");
const SERVER_ROOT = path.resolve(`${__dirname}/../`);
const TESTING_TIMEOUT_INTERVAL = require(`${__dirname}/testing.json`).maxtestinginterval;


async function runTestsAsync(argv) {
	const testCasesDir = path.resolve(argv[0]);
    const allfiles = fs.readdirSync(testCasesDir);
    for (const fileEntry of allfiles) if (fileEntry.toLowerCase().startsWith("test") && 
		fileEntry.toLowerCase().endsWith(".js") && (fileEntry != path.basename(__filename))) {

		const testModule = require(`${testCasesDir}/${fileEntry}`);
		if (testModule.runTestsAsync) try {
			let resultLog; const testResult = await testModule.runTestsAsync(argv.slice(1));
			if (testResult) resultLog = `Testcase ${fileEntry} succeeded.\n\n`;
			else resultLog = `Testcase ${fileEntry} failed with error false\n\n`;
			LOG[testResult?"info":"error"](resultLog); LOG.console(resultLog);
		} catch (err) {
			const error = `Testcase ${fileEntry} failed with error ${err}\n\n`;
			LOG.error(error); LOG.console(error);
		}
		else {
			const errorMsg = `Skipping ${fileEntry} as it is not a proper test case module.\n\n`;
			LOG.warn(errorMsg); LOG.console(errorMsg);
		}
	}
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

	/* Init the global memory */
	LOG.info("Initializing the global memory.");
	require(CONSTANTS.LIBDIR+"/globalmemory.js").init();
	
	/* Try to init the apps themselves */
	LOG.info("Initializing the apps.");
	try {require(CONSTANTS.LIBDIR+"/app.js").initAppsSync()} catch (err) {
		LOG.console(`Error initializing the apps ${err}.${err.stack?"\n"+err.stack+"\n":""}`);
		LOG.error(`Error initializing the apps ${err}.${err.stack?"\n"+err.stack:""}`);
		throw err;	// stop the test environment as app init failed
	}

	/* Log the start */
	LOG.info("Server testing environment initialized.");
	LOG.console("\nServer testing environment initialized.\n");
}

async function main(argv) {
	if (!argv[0]) {
		console.error(`Usage: ${__filename} [app tests folder path] [...other params]`);
		exit(1);
	}

	try {
        setupServerEnvironmentForTesting(); // Init the server environment only
        if (TESTING_TIMEOUT_INTERVAL && TESTING_TIMEOUT_INTERVAL > 0) {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: The test cases are taking too long to complete')), TESTING_TIMEOUT_INTERVAL)
            );
            await Promise.race([runTestsAsync(argv), timeoutPromise]); // Force timeout error if the tests take too long
        } else {
            await runTestsAsync(argv); // Run tests without timeout
        }
    } catch (err) {
        LOG.error(`Failed to initialize the server environment or run the test cases: ${err}.${err.stack ? "\n" + err.stack : ""}`);
        exit(1);
    }

	LOG.flushSync();  // Ensure all logs are written out before exit
	shouldExit = true; // exit

}

const exit = (code = 0) => process.exit(code);

let shouldExit = false;
if (require.main === module) {main(process.argv.slice(2)); setInterval(_=>{if (shouldExit) exit();}, 100 );}