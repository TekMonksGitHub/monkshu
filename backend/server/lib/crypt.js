/* 
 * (C) 2015 - 2018 TekMonks. All rights reserved.
 */
if (!global.CONSTANTS) global.CONSTANTS = require(__dirname + "/constants.js");	// to support direct execution

const cryptmod = require("crypto");
const crypt = require(CONSTANTS.CRYPTCONF);

function encrypt(text, key = crypt.key) {
	const iv = Buffer.from(cryptmod.randomBytes(16)).toString("hex").slice(0, 16);
	const password_hash = cryptmod.createHash("md5").update(key, "utf-8").digest("hex").toUpperCase();
	const cipher = cryptmod.createCipheriv(crypt.crypt_algo, password_hash, iv);
	let crypted = cipher.update(text, "utf8", "hex");
	crypted += cipher.final("hex");
	return crypted + iv;
}

function decrypt(text, key = crypt.key) {
	const iv = text.slice(text.length - 16, text.length);
	text = text.substring(0, text.length - 16);
	const password_hash = cryptmod.createHash("md5").update(key, "utf-8").digest("hex").toUpperCase();
	const decipher = cryptmod.createDecipheriv(crypt.crypt_algo, password_hash, iv);
	let decrypted = decipher.update(text, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
}

if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.log("Usage: crypt <encyrpt|decrypt> <text to encrypt or decrypt>");
		process.exit(1);
	}

	console.log(eval(args[0])(args[1]));
}

module.exports = { encrypt, decrypt };
