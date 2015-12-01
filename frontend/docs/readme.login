To over-ride the login page with your own custom login page, and associated Javascript code:

If your application doesn't need a login at all (it is login-less) then in the Application.init() method
set this to false: $$.S_NEEDS_LOGIN = false;

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
	
	oldsignout();	// this is optional if you are handling the user ID and session completely in a custom mannner
}

If you want to over-ride the built in LoginManager then:
$$.loginmanager = function() {};

$$.loginmanager.signin = function(id, pass, callback) {
	// your custom code for sign in goes here
	// callback( { result : true || false } )
	// result will be true for success and false otherwise
};

$$.loginmanager.register = function (id, pass, callback) {
	// your custom code for registration goes here
	// callback( { result : true || false } ) 
	// result will be true for success and false otherwise
};

$$.loginmanager.signout = function() {
	// your custom code for logout in goes here
};

