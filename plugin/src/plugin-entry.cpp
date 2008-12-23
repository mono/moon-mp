#include "config.h"

#include <string.h>
#include <npupp.h>
#include <glib.h>

static NPNetscapeFuncs MozillaFuncs;

static NPError
MoonPlayer_New (NPMIMEType mime_type, NPP instance, uint16 mode, int16 argc, char **argn, char **argv, NPSavedData *saved)
{
	g_debug ("NEW");
	//return NPERR_INVALID_INSTANCE_ERROR;
	return NPERR_NO_ERROR;
}

static NPError
MoonPlayer_Destroy (NPP instance, NPSavedData **save)
{
	g_debug ("DESTROU");
	return NPERR_NO_ERROR;
}

static NPError
MoonPlayer_NewStream (NPP instance, NPMIMEType type, NPStream *stream_ptr, NPBool seekable, uint16 *stype)
{
	g_debug ("New Stream");
	return NPERR_INVALID_PARAM;
}

static NPError
MoonPlayer_StreamAsFile (NPP instance, NPStream* stream, const char *filename)
{
	g_debug ("STREAM: %s", filename);
	return NPERR_INVALID_PARAM;
}

static NPError
MoonPlayer_DestroyStream (NPP instance, NPStream *stream, NPError reason)
{
	return NPERR_NO_ERROR;
}

static int32
MoonPlayer_WriteReady (NPP instance, NPStream *stream)
{
	return 0;
}

static int32
MoonPlayer_Write (NPP instance, NPStream *stream, int32 offset, int32 len, void *buffer)
{
	return -1;
}

static NPError
MoonPlayer_GetValue (NPP instance, NPPVariable variable, void *value)
{
	NPError err = NPERR_NO_ERROR;

	switch (variable) {
	case NPPVpluginNameString:
		*((char **) value) = "Suck On My Nuts";
		break;

	case NPPVpluginDescriptionString:
		*((char **) value) = "This plug-in detects balls dropping on your face";
		break;

	case NPPVpluginNeedsXEmbed:
		*((NPBool *) value) = FALSE;
		break;

	default:
		err = NPERR_INVALID_PARAM;
		break;
	}

	return err;
}

extern "C" {

NPError
NP_GetValue (void *future, NPPVariable variable, void *value)
{
	g_debug ("GETVALUE : %d", variable);
	return MoonPlayer_GetValue (NULL, variable, value);
}

char *
NP_GetMIMEDescription (void)
{
	g_debug ("GetMIMEDescription");
	return "video/x-ms-wmv:wmv:wmv;";
}

NPError
NP_Initialize (NPNetscapeFuncs *mozilla_funcs, NPPluginFuncs *plugin_funcs)
{
	g_debug ("NP_Initialize");

	if (mozilla_funcs == NULL || plugin_funcs == NULL)
		return NPERR_INVALID_FUNCTABLE_ERROR;

	if ((mozilla_funcs->version >> 8) > NP_VERSION_MAJOR)
		return NPERR_INCOMPATIBLE_VERSION_ERROR;
	
	MozillaFuncs.size                    = mozilla_funcs->size;
	MozillaFuncs.version                 = mozilla_funcs->version;
	MozillaFuncs.geturlnotify            = mozilla_funcs->geturlnotify;
	MozillaFuncs.geturl                  = mozilla_funcs->geturl;
	MozillaFuncs.posturlnotify           = mozilla_funcs->posturlnotify;
	MozillaFuncs.posturl                 = mozilla_funcs->posturl;
	MozillaFuncs.requestread             = mozilla_funcs->requestread;
	MozillaFuncs.newstream               = mozilla_funcs->newstream;
	MozillaFuncs.write                   = mozilla_funcs->write;
	MozillaFuncs.destroystream           = mozilla_funcs->destroystream;
	MozillaFuncs.status                  = mozilla_funcs->status;
	MozillaFuncs.uagent                  = mozilla_funcs->uagent;
	MozillaFuncs.memalloc                = mozilla_funcs->memalloc;
	MozillaFuncs.memfree                 = mozilla_funcs->memfree;
	MozillaFuncs.memflush                = mozilla_funcs->memflush;
	MozillaFuncs.reloadplugins           = mozilla_funcs->reloadplugins;
	MozillaFuncs.getJavaEnv              = mozilla_funcs->getJavaEnv;
	MozillaFuncs.getJavaPeer             = mozilla_funcs->getJavaPeer;
	MozillaFuncs.getvalue                = mozilla_funcs->getvalue;
	MozillaFuncs.setvalue                = mozilla_funcs->setvalue;
	MozillaFuncs.invalidaterect          = mozilla_funcs->invalidaterect;
	MozillaFuncs.invalidateregion        = mozilla_funcs->invalidateregion;
	MozillaFuncs.forceredraw             = mozilla_funcs->forceredraw;

	if (mozilla_funcs->version >= NPVERS_HAS_NPRUNTIME_SCRIPTING) {
		MozillaFuncs.getstringidentifier    = mozilla_funcs->getstringidentifier;
		MozillaFuncs.getstringidentifiers   = mozilla_funcs->getstringidentifiers;
		MozillaFuncs.getintidentifier       = mozilla_funcs->getintidentifier;
		MozillaFuncs.identifierisstring     = mozilla_funcs->identifierisstring;
		MozillaFuncs.utf8fromidentifier     = mozilla_funcs->utf8fromidentifier;
		MozillaFuncs.intfromidentifier      = mozilla_funcs->intfromidentifier;
		MozillaFuncs.createobject           = mozilla_funcs->createobject;
		MozillaFuncs.retainobject           = mozilla_funcs->retainobject;
		MozillaFuncs.releaseobject          = mozilla_funcs->releaseobject;
		MozillaFuncs.invoke                 = mozilla_funcs->invoke;
		MozillaFuncs.invokeDefault          = mozilla_funcs->invokeDefault;
		MozillaFuncs.evaluate               = mozilla_funcs->evaluate;
		MozillaFuncs.getproperty            = mozilla_funcs->getproperty;
		MozillaFuncs.setproperty            = mozilla_funcs->setproperty;
		MozillaFuncs.removeproperty         = mozilla_funcs->removeproperty;
		MozillaFuncs.hasproperty            = mozilla_funcs->hasproperty;
		MozillaFuncs.hasmethod              = mozilla_funcs->hasmethod;
		MozillaFuncs.releasevariantvalue    = mozilla_funcs->releasevariantvalue;
		MozillaFuncs.setexception           = mozilla_funcs->setexception;
	}

	if (mozilla_funcs->version >= NPVERS_HAS_NPOBJECT_ENUM) {
		MozillaFuncs.enumerate = mozilla_funcs->enumerate;
	}

	if (mozilla_funcs->version >= NPVERS_HAS_POPUPS_ENABLED_STATE) {
		MozillaFuncs.pushpopupsenabledstate = mozilla_funcs->pushpopupsenabledstate;
		MozillaFuncs.poppopupsenabledstate  = mozilla_funcs->poppopupsenabledstate;
	}

	if (plugin_funcs->size < sizeof (NPPluginFuncs))
		return NPERR_INVALID_FUNCTABLE_ERROR;

	plugin_funcs->size = sizeof (NPPluginFuncs);
	plugin_funcs->version = (NP_VERSION_MAJOR << 8) + NP_VERSION_MINOR;
	plugin_funcs->newp = NewNPP_NewProc (MoonPlayer_New);
	plugin_funcs->destroy = NewNPP_DestroyProc (MoonPlayer_Destroy);
	plugin_funcs->setwindow = NewNPP_SetWindowProc (NULL);
	plugin_funcs->newstream = NewNPP_NewStreamProc (MoonPlayer_NewStream);
	plugin_funcs->destroystream = NewNPP_DestroyStreamProc (MoonPlayer_DestroyStream);
	plugin_funcs->asfile = NewNPP_StreamAsFileProc (MoonPlayer_StreamAsFile);
	plugin_funcs->writeready = NewNPP_WriteReadyProc (MoonPlayer_WriteReady);
	plugin_funcs->write = NewNPP_WriteProc (MoonPlayer_Write);
	plugin_funcs->print = NewNPP_PrintProc (NULL);
	plugin_funcs->event = NewNPP_HandleEventProc (NULL);
	plugin_funcs->urlnotify = NewNPP_URLNotifyProc (NULL);
	plugin_funcs->javaClass = NULL;
	plugin_funcs->getvalue = NewNPP_GetValueProc (MoonPlayer_GetValue);
	plugin_funcs->setvalue = NewNPP_SetValueProc (NULL);

	return NPERR_NO_ERROR;
}

NPError
NP_Shutdown (void)
{
	return NPERR_NO_ERROR;
}

}

