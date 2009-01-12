#include <config.h>
#include <stdio.h>
#include <string.h>

#include <glib.h>
#include <gmodule.h>
#include <npupp.h>

#define MOON_LOADER_ENABLED 0

#if MOON_LOADER_ENABLED
# define MOON_LOADER_QUOTE(x) #x
# define MOON_LOADER_SYM(x) MOON_LOADER_QUOTE(Plugin_##x)
# define MOON_MODULE "libmoonplugin"
#else
# define MOON_LOADER_SYM(x) #x
# define MOON_MODULE "libmoonloader"
#endif

#define mp_debug(...) g_debug   ("libmoonmp-plugin: " __VA_ARGS__)
#define mp_error(...) g_warning ("libmoonmp-plugin: " __VA_ARGS__)

#define MOON_CHECK_LOAD_PLUGIN() { \
	if (G_UNLIKELY (moonlight_plugin.module == NULL)) { \
		moon_mp_load_moonlight (); \
	} \
}

typedef NPError (* MoonEntry_NP_Initialize) (NPNetscapeFuncs *mozilla_funcs, NPPluginFuncs *plugin_funcs);
typedef NPError (* MoonEntry_NP_Shutdown)   ();
typedef NPError (* MoonEntry_NP_GetValue)   (gpointer future, NPPVariable variable, gpointer value);

static struct {
	GModule *module;
	gchar *mime_description;
	MoonEntry_NP_Initialize np_initialize;
	MoonEntry_NP_Shutdown np_shutdown;
	MoonEntry_NP_GetValue np_getvalue;
} moonlight_plugin = { 0, };

static struct {
	const gchar *mime_type;
	const gchar *extensions;
	const gchar *description;
} moon_mp_mime_types [] = {
	{ "application/x-silverlight",      "scr",           "Microsoft Silverlight" },
	/*{ "video/x-ms-asf-plugin",          "asf, wmv",      "ASF Video" },
	{ "video/x-msvideo",                "asf, wmv",      "AVI Video" },
	{ "video/x-ms-asf",                 "asf",           "ASF Video" },
	{ "video/x-ms-wmv",                 "wmv",           "Windows Media Video" },
	{ "video/x-wmv",                    "wmv",           "Windows Media Video" },
	{ "video/x-ms-wvx",                 "wmv",           "Windows Media Video" },
	{ "video/x-ms-wm",                  "wmv",           "Windows Media Video" },
	{ "video/x-ms-wmp",                 "wmv",           "Windows Media Video" },
	{ "application/x-ms-wms",           "wms",           "Windows Media Video" },
	{ "application/x-ms-wmp",           "wmp",           "Windows Media Video" },
	{ "application/asx",                "asx",           "Microsoft ASX Playlist" },
	{ "audio/x-ms-wma",                 "wma",           "Windows Media Audio" },
	{ "audio/mpeg",                     "mp3",           "MPEG Audio" },*/
};

static gboolean
moon_mp_load_symbol (const gchar *symbol_name, gpointer *symbol)
{
	if (!g_module_symbol (moonlight_plugin.module, symbol_name, symbol)) {
		mp_error ("Could not locate '%s' symbol in Moonlight plugin (%s)",
			symbol_name, g_module_error ());

		g_module_close (moonlight_plugin.module);
		moonlight_plugin.module = NULL;

		return FALSE;
	}

	return TRUE;
}

static NPError
moon_mp_load_moonlight ()
{
	gchar *plugin_path;

	if (moonlight_plugin.module != NULL) {
		return NPERR_NO_ERROR;
	}

	//plugin_path = g_build_filename (g_get_home_dir (), ".mozilla", "plugins", "libmoonloader.so", NULL);
	plugin_path = g_build_filename ("/usr/lib64/moon/plugin", MOON_MODULE ".so", NULL);
	if (!g_file_test (plugin_path, G_FILE_TEST_EXISTS)) {
		g_free (plugin_path);
		plugin_path = g_build_filename ("/usr/lib/moon/plugin", MOON_MODULE ".so", NULL);
	}

	moonlight_plugin.module = g_module_open (plugin_path, G_MODULE_BIND_LOCAL);
	if (moonlight_plugin.module == NULL) {
		mp_error ("Could not load Moonlight plugin: %s (%s)", 
			plugin_path, g_module_error ());
		g_free (plugin_path);
		return NPERR_GENERIC_ERROR;
	}

	g_free (plugin_path);
	
	if (!moon_mp_load_symbol (MOON_LOADER_SYM (NP_Initialize), (gpointer *)&moonlight_plugin.np_initialize)) {
		return NPERR_GENERIC_ERROR;
	}
	
	if (!moon_mp_load_symbol (MOON_LOADER_SYM (NP_Shutdown), (gpointer *)&moonlight_plugin.np_shutdown)) {
		return NPERR_GENERIC_ERROR;
	}

	if (!moon_mp_load_symbol (MOON_LOADER_SYM (NP_GetValue), (gpointer *)&moonlight_plugin.np_getvalue)) {
		return NPERR_GENERIC_ERROR;
	}

	mp_debug ("Loaded Moonlight plugin");

	return NPERR_NO_ERROR;
}

NPError
NP_Initialize (NPNetscapeFuncs *mozilla_funcs, NPPluginFuncs *plugin_funcs)
{
	mp_debug ("NP_Initialize (%p, %p)", mozilla_funcs, plugin_funcs);

	MOON_CHECK_LOAD_PLUGIN ();
	if (moonlight_plugin.np_initialize != NULL) {
		return moonlight_plugin.np_initialize (mozilla_funcs, plugin_funcs);
	}

	return NPERR_GENERIC_ERROR;
}

NPError
NP_Shutdown ()
{
	mp_debug ("NP_Shutdown");

	if (moonlight_plugin.module != NULL) {
		if (moonlight_plugin.np_shutdown != NULL) {
			moonlight_plugin.np_shutdown ();
		}

		g_module_close (moonlight_plugin.module);
	}

	g_free (moonlight_plugin.mime_description);
	memset (&moonlight_plugin, 0, sizeof (moonlight_plugin));

	return NPERR_NO_ERROR;
}

NPError
NP_GetValue (gpointer future, NPPVariable variable, gpointer value)
{
	mp_debug ("NP_GetValue");

	MOON_CHECK_LOAD_PLUGIN ();

	switch (variable) {
		case NPPVpluginNameString:
			*((gchar **)value) = (gchar *)"Moonlight Media Player";
			return NPERR_NO_ERROR;
		case NPPVpluginDescriptionString:
			*((gchar **)value) = (gchar *)"A media player powered by Moonlight, largely "
				"compatible with the Windows Media Player ActiveX control.";
			return NPERR_NO_ERROR;
		default:
			if (moonlight_plugin.np_getvalue != NULL) {
				return moonlight_plugin.np_getvalue (future, variable, value); 
			}

			return NPERR_GENERIC_ERROR;
	}

	g_assert_not_reached ();
}

gchar *
NP_GetMIMEDescription ()
{
	GString *str;
	guint i;

	mp_debug ("NP_GetMIMEDescription");

	if (moonlight_plugin.mime_description != NULL) {
		return moonlight_plugin.mime_description;
	}

	str = g_string_new ("");
	for (i = 0; i < G_N_ELEMENTS (moon_mp_mime_types); i++) {
		if (i > 0) {
			g_string_append_c (str, ';');
		}

		g_string_append (str, moon_mp_mime_types[i].mime_type);
		g_string_append_c (str, ':');
			
		if (moon_mp_mime_types[i].extensions) {
			g_string_append (str, moon_mp_mime_types[i].extensions);
		}

		g_string_append_c (str, ':');
		g_string_append (str, moon_mp_mime_types[i].description);
	}
	
	moonlight_plugin.mime_description = str->str;
	g_string_free (str, false);
	
	return moonlight_plugin.mime_description;
}

