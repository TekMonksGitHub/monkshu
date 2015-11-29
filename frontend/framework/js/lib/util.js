/* 
 * (C) 2015 TekMonks. All rights reserved.
 * License: MIT - see enclosed license.txt file.
 */

$$.getElementsByClassName = function (theClass,node)
{
    var classElms = [];
    if ( node == null )
    {
    	node = document;
    }
    if (node.getElementsByClassName)
    { // check if it's natively available
    	// if it is, loop through the items in the NodeList...
        var tempEls = node.getElementsByClassName(theClass);
        for (var i = 0; i < tempEls.length ; i++)
        {
    		// ... and push them into an Array
                classElms.push(tempEls[i]);
    	}
    }
    else
    {
        // if a native implementation is not available, use a custom one
        var getclass = new RegExp('\\b'+theClass+'\\b');
        var elems = node.getElementsByTagName('*');
        for (var i = 0; i < elems.length; i++)
        {
                 var classes = elems[i].className;
                 if (getclass.test(classes)) classElms.push(elem[i]);
        }
    }
    return classElms;
};

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fn, scope) {
        var i, len;
        for (i = 0, len = this.length; i < len; ++i) {
            if (i in this) {
                fn.call(scope, this[i], i, this);
            }
        }
    };
}

$$.fade = function (element, callback) {
	var op = 1;  // initial opacity
	var timer = setInterval(function () {
		if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
            callback();
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 50);
};

$$.toast = function(message, font, duration) {
	var divToast = document.createElement("div");
	
	divToast.style["width"] = "200px";
    divToast.style["height"] = "20px";
    divToast.style["height"] = "auto";
    divToast.style["position"] = "absolute";
    divToast.style["left"] = "50%";
    divToast.style["margin-left"] = "-100px";
    divToast.style["bottom"] = "10px";
    divToast.style["background-color"] = "#383838";
    divToast.style["color"] = "#F0F0F0";
    if (font !== undefined) divToast.style["font-family"] = font;
    else divToast.style["font-family"] = "sans-serif";
    divToast.style["font-size"] = "20px";
    divToast.style["padding"] = "10px";
    divToast.style["text-align"] = "center";
    divToast.style["border-radius"] = "2px";
    divToast.style["-webkit-box-shadow"] = "0px 0px 24px -1px rgba(56, 56, 56, 1)";
    divToast.style["-moz-box-shadow"] = "0px 0px 24px -1px rgba(56, 56, 56, 1)";
    divToast.style["box-shadow"] = "0px 0px 24px -1px rgba(56, 56, 56, 1)";
    divToast.style["display"] = "block";
    divToast.style["opacity"] = 1;
	divToast.style["filter"] = "alpha(opacity=100)";
    
    divToast.innerText = message;
    
    document.body.appendChild(divToast);
    
    if (duration == null) duration = 5000;
    
	setTimeout(function(){$$.fade(divToast,function(){document.body.removeChild(divToast);});},duration);
};

$$.htmlEncode = function (str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
};

$$.htmlDecode = function (value){
    return String(value)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
};

// add isArray if needed
if (typeof Array.isArray === 'undefined') {
  Array.isArray = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };
};
