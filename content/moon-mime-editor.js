function MIME_URI (mimetype) {
    return "urn:mimetype:" + mimetype;
}

function MoonMimeEditor () {    
}

MoonMimeEditor.prototype = {
    
    Initialize: function (mimetypes) {
        mimetypes.map (function (mimetype) {
            MoonConsole.ObjDump (this.rdf_service.GetUnicodeResource (MIME_URI (mimetype)), true);
        }, this);
    },

    _rdf_service: null,
    get rdf_service () {
        if (!this._rdf_service) {
            this._rdf_service = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                .getService (Components.interfaces.nsIRDFService);
        }

        return this._rdf_service;
    },

    _rdf_data_source: null,
    get rdf_data_source () {
        if (!this._rdf_data_source) {
            this._rdf_data_source = this.LoadRdfDataSource (this.rdf_service);
        }

        return this._rdf_data_source;
    },
    
    LoadRdfDataSource: function (rdf_service) {
        const mime_types = "UMimTyp";
        var directory_service = Components.classes["@mozilla.org/file/directory_service;1"]
            .getService ()
            .QueryInterface (Components.interfaces.nsIProperties);

        var file = directory_service.get (mime_types, Components.interfaces.nsIFile);
        var io_service = Components.classes["@mozilla.org/network/io-service;1"]
            .getService (Components.interfaces.nsIIOService);

        var file_handler = io_service.getProtocolHandler ("file")
            .QueryInterface (Components.interfaces.nsIFileProtocolHandler);

        return rdf_service.GetDataSource (file_handler.getURLSpecFromFile (file));
    }
}
