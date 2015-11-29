To over-ride the login page with your own custom login page, and associated Javascript code:

Set this to point to the URL for your login page:
$$.S_LOGIN_THTML

e.g.
$$.S_LOGIN_THTML = $$.S_FRONTEND+"/app/login.thtml"

And in your file include the Javascript etc. you need to implement your login mechanism.

Please note, after login, this variable must be set in the session so that everything keeps working:

$$.session().put($$.S_USERID, <your user ID>)

If you want to implement your own logout function as well then override this function:

$$.signout()

E.g.
var oldsignout = $$.signout
$$.signout = function() {
	// your custom logout code here
	
	outsignout();	// this is optional if you are handling the user ID and session completely in a custom mannner
}
