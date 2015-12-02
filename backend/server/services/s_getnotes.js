/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed LICENSE file.
 */

var fs = require("fs");
var APP_CONSTANTS = require(__dirname + "/lib/constants.js");

// String extension
if ( typeof String.prototype.endsWith != 'function' ) {
  String.prototype.endsWith = function( str ) {
    return this.substring( this.length - str.length, this.length ) === str;
  };
};

exports.doService = doService;

function doService(jsonReq, callback) {
	var userdbPath = 
		require(CONSTANTS.LIBDIR+"/userid.js").getUserPath(jsonReq.id);
		
	var resp = {};
	resp["result"] = true;
	
	fs.readdir(userdbPath, function(err, files) {
		if (err) {
			resp["result"] = false;
			callback(resp);
			return;
		}
		
		if ((files == null) || (files.length == 0)) {	// no notes created yet
			resp["notes"] = [];
			callback(resp);
			return;
		}
		
		var notes = [];
		
		var notesPresent = countNotes(files);
		
		for (var i = 0; i < files.length; i++) {
			if (!files[i].endsWith(APP_CONSTANTS.NOTE_EXT)) continue;
			
			getNoteDescObject(userdbPath+"/"+files[i], function(obj) {
				notes.push(obj);
				
				if (notes.length == notesPresent) {
					resp["notes"] = notes;
					callback(resp);
					return;
				}
			});
		}
		
	});
}

function countNotes(files) {
	var count = 0;
	for (var i = 0; i < files.length; i++)
		if (files[i].endsWith(APP_CONSTANTS.NOTE_EXT)) count++;
		
	return count;
}

function getNoteDescObject(filepath, callback) {
	var obj = {};
	
	fs.readFile(filepath, function(err, data){
		if (err) {
			var fileData = {};
			fileData["ts"] = "";
			fileData["title"] = "";
			callback(fileData);
		} else {
			var dataObj = JSON.parse(data);
			var fileData = {};
			fileData["ts"] = dataObj.ts;
			fileData["title"] = dataObj.title;
			callback(fileData);
		}
	});
}
