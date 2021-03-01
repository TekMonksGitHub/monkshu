/**
 * (C) 2021 TekMonks. All rights reserved. 
 * 
 */

const path = require("path");
const monkshu_root = path.resolve(__dirname + "/../../../");

module.exports = { ...require(`${monkshu_root}/backend/server/lib/crypt.js`) };

if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.length < 2 || !module.exports[args[0]]) {
		console.log("Usage: crypt <encyrpt|decrypt> <text to encrypt or decrypt>");
		process.exit(1);
	}

	console.log(module.exports[args[0]](args[1]));
}
