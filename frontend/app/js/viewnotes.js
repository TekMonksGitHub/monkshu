/* 
 * Handler for viewnotes.thtml file. 
 *
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

function viewNote(ts) {
	$$.session().put(S_SESSION_NOTE_ID,ts);
	$$.loadthtml(S_ADDNOTE_THTML,{});
}

function deleteNote(ts) {
	var req = {}; req[$$.S_USERID] = $$.session().get($$.S_USERID); req["ts"] = ts;
	
	$$.rest(S_DELETE_NOTE, req, function(resp) {
		if (resp.result) {
			var parent = document.getElementById("listcontainer");
			var divToDel1 = document.getElementById(ts);
			var divToDel2 = document.getElementById(ts+"_padding");
			$$.fade(divToDel1, function() {
				parent.removeChild(divToDel1);
				divToDel2.style.display = "none";
				parent.removeChild(divToDel2);
				$$.toast($$.S_I18N_VAR.i18n.Deleted, "opensans", 2000);
			});
			
		} else {
			$$.toast($$.S_I18N_VAR.i18n.Error, "opensans", 2000);
		}
	});
}

function doNavViewMain() {
	$$.session().remove(S_SESSION_NOTE_ID);
	Application.main();
}