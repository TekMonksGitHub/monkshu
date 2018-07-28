/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */
var crypto = require("crypto");

function encrypt(text) {
  var cipher = crypto.createCipher(CONSTANTS.CRPT_ALGO, CONSTANTS.CRYPT_PASS);
  var crypted = cipher.update(text,"utf8","hex");
  crypted += cipher.final("hex");
  return crypted;
}
 
function decrypt(text) {
  var decipher = crypto.createDecipher(CONSTANTS.CRPT_ALGO, CONSTANTS.CRYPT_PASS);
  var decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

if (require.main === module) {
	global.CONSTANTS = require(__dirname + "/constants.js");
	
	var args = process.argv.slice(2);
	
	if (args.length == 0) {
		console.log("Usage: crypt <text to encrypt>");
		process.exit(1);
	}
	
	console.log(encrypt(args[0]));
}

module.exports = {
	encrypt : encrypt,
	decrypt : decrypt
};
