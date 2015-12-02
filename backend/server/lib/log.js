/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var fs = require("fs");
var winston	= require("winston");

function initGlobalLogger() {
	/* create the logger */
	if (!fs.existsSync(CONSTANTS.LOGSDIR)) {fs.mkdirSync(CONSTANTS.LOGSDIR);}
	
	var logger = new (winston.Logger)({
		transports: [ 
			new winston.transports.File({ 
				filename: CONSTANTS.ACCESSLOG,
				maxsize: 1024 * 1024 * 100 // 100MB
			})
		]
	});
	
	GLOBAL.log = logger;
	
	logger.info("*************************************");
	logger.info("*************************************");
	logger.info("Logging subsystem initialized.");
}

exports.initGlobalLogger = initGlobalLogger;