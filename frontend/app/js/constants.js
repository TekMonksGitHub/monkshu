/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

/////////////////////////////////////////////////////
// All the constants used by the application
/////////////////////////////////////////////////////

$$.S_FRONTEND = "http://localhost:8080";
$$.S_NODE = "http://localhost:3800";

var S_MAIN_THTML = $$.S_FRONTEND+"/app/main.thtml";
var S_ADDNOTE_THTML = $$.S_FRONTEND+"/app/addnote.thtml";
var S_VIEWNOTES_THTML = $$.S_FRONTEND+"/app/viewnotes.thtml";

var S_SAVE_NOTE = $$.S_NODE+"/savenote";
var S_VIEW_NOTES = $$.S_NODE+"/viewnotes";
var S_GET_NOTE = $$.S_NODE+"/getnote";
var S_DELETE_NOTE = $$.S_NODE+"/deletenote";

var S_SESSION_NOTE_ID = "com_monkshu_ts";
