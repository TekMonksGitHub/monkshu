/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

function doAddNote() {
	$$.session().remove(S_SESSION_NOTE_ID);	// we are starting a new note
	$$.loadthtml(S_ADDNOTE_THTML,{});
}

function doViewNotes() {
	var req = {}; req[$$.S_USERID] = $$.session().get($$.S_USERID);
	$$.rest(S_VIEW_NOTES, req, function(resp) {
		if (!resp.result) resp.notes = [];
		
		resp = addHumanDates(resp);
		$$.loadthtml(S_VIEWNOTES_THTML, resp);
	});
}

function addHumanDates(resp) {
	for (var i = 0; i < resp.notes.length; i++) {
		var ts = resp.notes[i].ts;
		var date = new Date(ts);
		var tsHuman = date.getDate() + "-" + date.getMonth() + "-" + date.getFullYear();
		resp.notes[i]["date"] = tsHuman;
	}
	
	return resp;
}
