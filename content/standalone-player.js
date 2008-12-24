function XULMoonEmbeddedPlayerInit (player) {
    // Install the Silverlight Player on the XUL Player
    window.player.player = player;
    window.player.MoonlightInitialize ();
}

function StandaloneMoonPlayer () {
    this.className = "StandaloneMoonPlayer";
    try {
        this.Initialize ();
    } catch (e) {
        MoonConsole.ObjDump (e, true);
    }
}

StandaloneMoonPlayer.prototype = {

    content: null,
    player: null,

    Initialize: function () {
        if (window.player) {
            throw "StandaloneMoonPlayer already installed on window";
        }

        window.player = this;
        this.content = document.getElementById ("moon-media-standalone-player");
        this.ConfigureWindow ();
        this.ProcessArguments ();
    },

    MoonlightInitialize: function () {
        if (location.query_string["uri"]) {
            this.LoadSource (location.query_string["uri"]);
        }
    },

    ProcessArguments: function () {
        location.query_string = [];
        var pairs = location.search.substring (1).split ("&");
        for (i in pairs) {
            var keyval = pairs[i].split ("=");
            location.query_string[keyval[0]] = keyval[1];
        }

        if (location.query_string["controls"] != "show") {
            document.loadOverlay ("chrome://moon-media/content/standalone-player-hidecontrols.xul", null);
        }
    },
    
    ConfigureWindow: function () {
        window.title = "Moonlight Media Player";
    },

    LoadSource: function (path) {
        this.player.LoadSource (decodeURI (MoonUtilities.PathToURI (path)));
    },

    OnFileOpen: function () {
        const nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance (nsIFilePicker);
        fp.init (window, "Select a File", nsIFilePicker.modeOpen);
        fp.appendFilter ("Media Files","*.mp3; *.wma; *.wmv; *.asf; *.asx");
        var res = fp.show ();
        if (res == nsIFilePicker.returnOK) {
            this.LoadSource (fp.file.path); 
        }
    },

    OnFullscreen: function () {
        this.player.Fullscreen ();
    }
}

