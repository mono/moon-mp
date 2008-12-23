function MoonMediaContentListener () {
}

MoonMediaContentListener.prototype = {

    loadCookie: null,
    parentContentListener: null,
    
    QueryInterface: function (iid) {
        if (iid.equals (Components.interfaces.nsIURIContentListener) ||
            iid.equals (Components.interfaces.nsISupportsWeakReference) ||
            iid.equals (Components.interfaces.nsISupports)) {
            return this;
        }

        throw Components.results.NS_NOINTERFACE;
    },

    onStartURIOpen: function (uri) {
        MoonConsole.Log (uri.spec);
        var abort = false;

        if(!abort && this.parentContentListener) {
            abort = this.parentContentListener.onStartURIOpen (aURI);
        }

        return abort;
    },

    doContent: function (a,b,c,d) {
        MoonConsole.Log ("doContent: " + a);
        return false;
    },

    canHandleContent: function(a,b,c) {
        MoonConsole.Log ("canHandleContent: " + a);
        return false;
    },

    isPreferred: function (contentType, b) {
        return MoonMediaExtension.SupportedMimeTypes.indexOf (contentType) >= 0;
    }  
}

