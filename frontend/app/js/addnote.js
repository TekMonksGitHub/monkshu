/* 
 * Handler for addnode.thtml file. 
 *
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

init();

function init() {
	if ($$.session().get(S_SESSION_NOTE_ID) == undefined) return;
	
	var ts = $$.session().get(S_SESSION_NOTE_ID);
	
	var req = {}; req[$$.S_USERID] = $$.session().get($$.S_USERID); req["ts"] = ts;
	$$.rest(S_GET_NOTE, req, function(resp) {
		if (resp.result) {
			document.getElementById("title").value = resp.data.title;
			document.getElementById("note").value = resp.data.note;
		}
	});
}

function doNavAddMain() {
	$$.session().remove(S_SESSION_NOTE_ID);
	Application.main();
}

function doSaveNote() {
	var req = {};
	req[$$.S_USERID] = $$.session().get($$.S_USERID);
	req["title"] = document.getElementById("title").value;
	req["note"] = document.getElementById("note").value;
	req["ts"] = $$.session().get(S_SESSION_NOTE_ID) == null ? 
		new Date().getTime() : $$.session().get(S_SESSION_NOTE_ID);
	$$.session().put(S_SESSION_NOTE_ID,req.ts);
	
	$$.rest(S_SAVE_NOTE, req, function(resp) {
		if (resp.result) {$$.toast($$.S_I18N_VAR.i18n.Saved, "opensans", 2000);}
		else {$$.toast($$.S_I18N_VAR.i18n.NotSaved, "opensans", 2000);}
	});
}
