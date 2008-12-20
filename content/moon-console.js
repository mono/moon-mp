var MoonConsole = {

    truncate_function_source: true,

    console_driver: function (x) {
        dump (x);
    },

    Log: function (str) {
        MoonConsole.console_driver (str + "\n");
    },

    Indent: function (indent, mult) {
        if (!mult) {
            mult = 2;
        }

        var indent_str = "";
        for (var i = 0; i < indent * mult; i++) {
            indent_str += " ";
        }
        
        return indent_str;
    },

    Write: function (str) {
        MoonConsole.console_driver (str);
    },

    WriteLine: function (str) {
        if (!str) {
            MoonConsole.console_driver ("\n");
        } else {
            MoonConsole.console_driver (str + "\n");
        }
    },

    WriteIndentLine: function (str, indent) {
        var indent_str = MoonConsole.Indent (indent);
        MoonConsole.WriteLine (indent_str + str.toString ());
    },

    WriteIndent: function (str, indent) {
        MoonConsole.Write (MoonConsole.Indent (indent) + str.toString ());
    },

    ObjectVisibleChildCount: function (o) {
        if (o instanceof Array) {
            return o.length;
        }

        var count = 0;
        for (prop in o) {
            count++;
        }

        return count;
    },

    _ObjDumpProperty: function (o, prop, invoke_getters, level, i, count, max_prop_len) {
        var is_getter = !invoke_getters && o.__lookupGetter__ (prop);
        var is_setter = o.__lookupSetter__ (prop);
        var eval_prop = null;

        if (!is_getter && !is_setter) {
            try {
                eval_prop = o[prop];
            } catch (e) {
                eval_prop = { 
                    MoonConsole_ObjDump_Error: "Exception when dumping property '" + prop + "'", 
                    Details: e 
                };
            }
        }
        
        var prefix = o instanceof Array ? "" : prop + ": ";
        
        if (eval_prop != null && typeof eval_prop == "object" && 
            MoonConsole.ObjectVisibleChildCount (eval_prop) > 0) {
            MoonConsole.WriteIndent (prefix, level + 1);
        } else {
            MoonConsole.WriteIndent (prefix + MoonConsole.Indent (max_prop_len - 
                prop.length, 1), level + 1);
        }

        if (is_getter) {
            MoonConsole.Write ("get ()");
        } else if (is_setter) {
            MoonConsole.Write ("set (x)");
        } else {
            MoonConsole.ObjDump (eval_prop, invoke_getters, level + 1);
        }

        if (i < count - 1) {
            MoonConsole.Write (",");
        }

        MoonConsole.WriteLine ();
    },

    ObjDump: function (o, invoke_getters, level) {
        if (!level) {
            level = 0;
        }

        if (!invoke_getters) {
            invoke_getters = false;
        }

        var max_type_len = "function ()".length;
        var type = typeof o;

        if (typeof o == "undefined") {
            type = "undefined";
        } else if (o === null) {
            type = "null";
        }

        switch (type) {
            case "undefined":
            case "null":
                MoonConsole.Write (type);
                break;
            case "object":
                var max_prop_len = 0;
                var count = 0;
                var i = 0;
                var obj_open_char = "{";
                var obj_close_char = "}";

                if (o instanceof Array) {
                    count = o.length;
                    obj_open_char = "[";
                    obj_close_char = "]";
                } else {
                    for (prop in o) {
                        if (prop.length > max_prop_len) {
                            max_prop_len = prop.length;
                        }
                        count++;
                    }
                } 

                var o_name = o ? o.toString () : null;
                if (o_name == null) {
                    MoonConsole.Write ("null");;
                } else if (o instanceof Array || o_name == "[object Object]") {
                    MoonConsole.Write (obj_open_char);
                } else {
                    var instanceof_str = o.constructor.name == "Object" 
                        ? "" : "[object " + o.constructor.name + "] ";
                    MoonConsole.Write (instanceof_str + "(" + o + ") {");
                }

                if (count == 0 && o_name != null) {
                    MoonConsole.Write (obj_close_char);
                    break;
                }

                MoonConsole.WriteLine ();

                if (o instanceof Array) {
                    for (var i = 0; i < count; i++) {
                        MoonConsole._ObjDumpProperty (o, i, invoke_getters, level, i, count, 0);
                    }
                } else {
                    for (prop in o) {
                        MoonConsole._ObjDumpProperty (o, prop, invoke_getters, level, i++, count, max_prop_len);
                    }
                }

                MoonConsole.WriteIndent (obj_close_char, level);
                break;
            case "function":
                var source = o.toSource ();
                if (MoonConsole.truncate_function_source && source.length > 80) {
                    source = source.substring (0, 80) + "... }";
                }

                if (level == 0) {
                    MoonConsole.Write (source);
                } else {
                    MoonConsole.Write (source.replace (/^function [A-Za-z0-9_]+/, 
                        "function ").replace (/^\(|\)$/g, ""));
                }
                break;
            case "string":
                MoonConsole.Write ('"' + o.toString ().replace (/"/g, "\\\"") + '"');
                break;
            default:
                MoonConsole.Write (o);
                break;
        }

        if (level == 0) {
            MoonConsole.WriteLine ();
        }
    }
}

