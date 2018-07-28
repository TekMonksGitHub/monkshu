/* 
 * (C) 2015 TekMonks. All rights reserved.
 */
var crypto = require("crypto");

function encrypt(text) {
	var iv = (new Buffer(crypto.randomBytes(16))).toString("hex").slice(0,16);
	var password_hash = crypto.createHash("md5").update(CONSTANTS.CRYPT_PASS, "utf-8").digest("hex").toUpperCase();
  var cipher = crypto.createCipheriv(CONSTANTS.CRPT_ALGO, password_hash, iv);
  var crypted = cipher.update(text,"utf8","hex");
  crypted += cipher.final("hex");
  return crypted+iv;
}
 
function decrypt(text) {
	var iv = text.slice(text.length-16, text.length);
	text = text.substring(0, text.length-16);
	var password_hash = crypto.createHash("md5").update(CONSTANTS.CRYPT_PASS, "utf-8").digest("hex").toUpperCase();
  var decipher = crypto.createDecipheriv(CONSTANTS.CRPT_ALGO, password_hash, iv);
  var decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

if (require.main === module) {
	global.CONSTANTS = require(__dirname + "/constants.js");
	
	var args = process.argv.slice(2);
	
	if (args.length < 2) {
		console.log("Usage: crypt <encyrpt|decrypt> <text to encrypt or decrypt>");
		process.exit(1);
	}
	
	console.log(eval(args[0])(args[1]));
}

module.exports = {
	encrypt : encrypt,
	decrypt : decrypt
};
