/** 
 * (C) 2023 TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 * 
 * jsonx.js - Extended JSON parser. Allows line breaks inside
 * the JSON using <space>\<\n> character sequence. And comments
 * using either # or // on an independent comment line. Inline 
 * comments are not yet supported.
 */

const fs = require("fs");

/**
 * Parses the given JSONX file, synchronously.
 * @param {string} path Path to the file
 * @param {string} encoding Optional, encoding, assumption is UTF-8
 * @returns The parsed file as a JSON object
 * @throws {object} SyntaxError if the file is malformed JSONX
 */
exports.parseFileSync = function(path, encoding="utf8") {
    const contents = fs.readFileSync(path, encoding);
    return exports.parseJSONX(contents);
}

/**
 * Parses the given JSONX file, asynchronously.
 * @param {string} path Path to the file
 * @param {string} encoding Optional, encoding, assumption is UTF-8
 * @returns The parsed file as a JSON object
 * @throws {object} SyntaxError if the file is malformed JSONX
 */
exports.parseFile = async function(path, encoding="utf8", _sync) {
    const contents = await fs.promises.readFile(path, encoding);
    return exports.parseJSONX(contents);
}

/**
 * Parses the given JSONX string or buffer.
 * @param {string|Buffer} jsonxContents The actual JSONX as string or Buffer object.
 * @param {string} encoding Optional, encoding, assumption is UTF-8
 * @returns The parsed contents as a JSON object
 * @throws {object} SyntaxError if the file is malformed JSONX
 */
exports.parseJSONX = function(jsonxContents, encoding="utf8") {
    const contentString = Buffer.isBuffer(jsonxContents) ? jsonxContents.toString(encoding) : jsonxContents;
    const jsonContents = contentString.replace(/\s\\[\r\n]+/g, " ").replace(/\s\\[\n]/g, " ").replace(/[ \t]*[#//].*?[\r\n]/g, "").replace(/[ \t]*[#//].*?[\n]/g, "").trim();
    return JSON.parse(jsonContents);
}