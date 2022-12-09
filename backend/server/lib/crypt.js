/* 
 * (C) 2015 - 2018 TekMonks. All rights reserved.
 */
if (!global.CONSTANTS) global.CONSTANTS = require(__dirname + "/constants.js");	// to support direct execution

const cryptmod = require("crypto");
const crypt = require(CONSTANTS.CRYPTCONF);

/**
 * Encrypts the given string or Buffer
 * @param {string or Buffer} textOrBuffer Text (in UTF8) or Buffer to encrypt, .toString is called if it is not one of these to convert (dangerous).
 * @param {string} key The encryption key to use, the key in conf/crypt.json is used if this is skipped
 * @param {Buffer} ivIn The initialization vector to use, optional. Funtion can pick random one if not provided.
 * @param {boolean} asBinary The result is returned as a Buffer not string
 * @returns The encrypted text as HEX string in UTF8 encoding or Buffer object if asBinary is true
 */
function encrypt(textOrBuffer, key = crypt.key, ivIn, asBinary) {
	const iv = ivIn||asBinary?cryptmod.randomBytes(16):Buffer.from(cryptmod.randomBytes(16)).toString("hex").slice(0, 16);
	const password_hash = cryptmod.createHash("md5").update(key, "utf-8").digest("hex").toUpperCase();
	const cipher = cryptmod.createCipheriv(crypt.crypt_algo||"aes-256-ctr", password_hash, iv);
	const textToEncrypt = ((typeof textOrBuffer !== "string") && (!Buffer.isBuffer(textOrBuffer))) ? textOrBuffer.toString() : textOrBuffer;
	let crypted = cipher.update(textToEncrypt, Buffer.isBuffer(textOrBuffer)?undefined:"utf8", asBinary?undefined:"hex");
	crypted += cipher.final(asBinary?undefined:"hex");
	return ivIn ? crypted : (asBinary ? Buffer.concat([crypted, iv]) : crypted+iv);
}

/**
 * Decrypts the given string or Buffer
 * @param {string or Buffer} textOrBuffer Text (in HEX) or buffer to decrypt, .toString is called if it is not one of these to convert (dangerous).
 * @param {string} key The encryption key to use, the key in conf/crypt.json is used if this is skipped
 * @param {Buffer} ivIn The initialization vector to use, optional. Funtion can read the random one if used while encrypting.
 * @param {boolean} asBinary The result is returned as a Buffer not string
 * @returns The decrypted text as string in UTF8 encoding or Buffer object if asBinary is true
 */
function decrypt(textOrBuffer, key = crypt.key, ivIn, asBinary) {
	const iv = ivIn||textOrBuffer.slice(textOrBuffer.length - 16, textOrBuffer.length);
	textOrBuffer = ivIn ? textOrBuffer : textOrBuffer[Buffer.isBuffer(textOrBuffer)?"slice":"substring"](0, textOrBuffer.length - 16);
	const password_hash = cryptmod.createHash("md5").update(key, "utf-8").digest("hex").toUpperCase();
	const decipher = cryptmod.createDecipheriv(crypt.crypt_algo||"aes-256-ctr", password_hash, iv);
	const textToDecrypt = ((typeof textOrBuffer !== "string") && (!Buffer.isBuffer(textOrBuffer))) ? textOrBuffer.toString() : textOrBuffer;
	let decrypted = decipher.update(textToDecrypt, Buffer.isBuffer(textOrBuffer)?undefined:"hex", asBinary?undefined:"utf8");
	decrypted += decipher.final(asBinary?undefined:"utf8");
	return decrypted;
}

/**
 * Returns a cipher object which can encrypt
 * @param {string} key The encryption key to use, the key in conf/crypt.json is used if this is skipped
 * @param {Buffer or HEX String} iv The initialization vector to use, a static vector is used if not provided
 * @returns The created cipher object
 */
function getCipher(key = crypt.key, iv = Buffer.alloc(16, 0)) {
	const password_hash = cryptmod.createHash("md5").update(key, "utf-8").digest("hex").toUpperCase();
	const cipher = cryptmod.createCipheriv(crypt.crypt_algo||"aes-256-ctr", password_hash, iv);
	return cipher;
}

/**
 * Returns a decipher object which can encrypt
 * @param {string} key The encryption key to use, the key in conf/crypt.json is used if this is skipped
 * @param {Buffer or HEX String} iv The initialization vector to use, a static vector is used if not provided
 * @returns The created decipher object
 */
function getDecipher(key = crypt.key, iv = Buffer.alloc(16, 0)) {
	const password_hash = cryptmod.createHash("md5").update(key, "utf-8").digest("hex").toUpperCase();
	const decipher = cryptmod.createDecipheriv(crypt.crypt_algo||"aes-256-ctr", password_hash, iv);
	return decipher;
}

module.exports = { encrypt, decrypt, getCipher, getDecipher, main }

if (require.main === module) main();
function main() {
	const args = process.argv.slice(2);

	if (args.length < 2 || !module.exports[args[0]]) {
		console.log("Usage: crypt <encyrpt|decrypt> <text to encrypt or decrypt>");
		process.exit(1);
	}

	console.log(module.exports[args[0]](args[1]));
}