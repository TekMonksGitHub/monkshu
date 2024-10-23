/**
 * Runs given test cases.
 * 
 * (C) 2023 Tekmonks. All rights reserved.
 */

const fs = require("fs");
const path = require("path");
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

async function main(argv) {
	process.env.___TESTING_ = true;
	const server = require(`${__dirname}/../server.js`);
	
	if (!argv[0]) {
		console.error(`Usage: ${path.basename(__filename)} [app tests folder path] [...other params]`);
		exit(1);
	}

	const _doExit = givenExitCode => {
		LOG.flushSync();  // Ensure all logs are written out before exit
		shouldExit = true; // exit
		if (givenExitCode) exitCode = givenExitCode;
	}

	try {
        await server.bootstrap(); // Init the server environment only
		LOG.console("\n\n************** Testing starts ***********\n\n");	// bifurcate the logging boundaries
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
		_doExit(1);
    }

	_doExit(0);
}

const exit = code => process.exit(code);

let shouldExit = false, exitCode = 0;
if (require.main === module) {main(process.argv.slice(2)); setInterval(_=>{if (shouldExit) exit(exitCode);}, 100 );}