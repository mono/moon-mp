function MoonMediaWebProgressListener () {
}

MoonMediaWebProgressListener.prototype = {
    QueryInterface: function (iid) {
        if (iid.equals (Components.interfaces.nsIWebProgressListener) ||
            iid.equals (Components.interfaces.nsISupportsWeakReference) ||
            iid.equals (Components.interfaces.nsISupports)) {
            return this;
        }

        throw Components.results.NS_NOINTERFACE;
    },

    onStateChange: function (webProgress, request, stateFlags, status) {
        const wpl = Components.interfaces.nsIWebProgressListener;

        try {
            if ((stateFlags & wpl.STATE_STOP) != 0 &&
                MoonMediaExtension.SupportedMimeTypes.indexOf (request.contentType) >= 0) {
                this.InterceptMedia (request);
            }
        } catch (e) {
            MoonConsole.Log ("Could not get contentType for nsIRequest");
        }
    },

    InterceptMedia: function (request) {
        var loaded_doc = null;
        var loaded_win = null;

        request.cancel (1);

        try {
           var interface_requestor = request.notificationCallbacks.QueryInterface (
                Components.interfaces.nsIInterfaceRequestor);
            loaded_win = interface_requestor.getInterface (Components.interfaces.nsIDOMWindow);
            loaded_doc = MoonMediaExtension.FindRootDocument (loaded_win.document);
        } catch (e) {
            MoonConsole.Log ("nsIHttpChannel for is not bound to an nsIDOMWindow for URI: " 
                + request.URI.spec);
        }

        if (!loaded_doc) {
            loaded_win = gBrowser.mCurrentBrowser;
            loaded_doc = MoonMediaExtension.FindRootDocument (gBrowser.mCurrentBrowser.contentDocument);
        }

        loaded_doc.body.innerHTML = request.URI.spec;
    },

    onStatusChange: function (webProgress, request, status, message) { 
    },
    
    onLocationChange: function (webProgress, request, location) { 
    },

    onProgressChange: function (webProgress, request, curSelfProgress, maxSelfProgress,
        curTotalProgress, maxTotalProgress) { 
    },
    
    onSecurityChange: function (webProgress, request, state) { 
    },

    DumpState: function (state) {
        const wpl = Components.interfaces.nsIWebProgressListener;
        var states = [];
        for (var prop in wpl) {
            if (prop.substring (0, 5) == "STATE") {
                if ((state & wpl[prop]) == wpl[prop]) {
                    states.push (prop);
                }
            }
        }
        MoonConsole.ObjDump (states);
    }
}

