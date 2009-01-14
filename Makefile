PACKAGE = moonlight-media-player
VERSION = 0.3
MIN_FIREFOX_VERSION = 2.0.0.0
MAX_FIREFOX_VERSION = 3.1.*
MIN_GECKO_VERSION = 1.9.0
MAX_GECKO_VERSION = 1.9.*
BUILD_ID = `date +%Y%m%d%H%M%S`

XPI_FILE = $(PACKAGE)-$(VERSION).xpi

DIST_FILES = \
	content \
	skin \
	standalone \
	install.rdf \
	chrome.manifest \
	license.txt

CLEAN_FILES = \
	install.rdf \
	standalone/application.ini \
	standalone/moonlight-media-player.desktop \
	$(XPI_FILE) \
	web \
	$(PACKAGE)-$(VERSION).tar.bz2

all:
	@echo "Choose one of 'dist', 'xpi', 'clean', 'web'"

install.rdf: install.rdf.in
	sed -e " \
		s/\@VERSION\@/$(VERSION)/g; \
		s/\@MAX_FIREFOX_VERSION\@/$(MAX_FIREFOX_VERSION)/g; \
		s/\@MIN_FIREFOX_VERSION\@/$(MIN_FIREFOX_VERSION)/g; \
	" < $< > $@

standalone/application.ini: standalone/application.ini.in
	sed -e " \
		s/\@VERSION\@/$(VERSION)/g; \
		s/\@BUILD_ID\@/$(BUILD_ID)/g; \
		s/\@MAX_GECKO_VERSION\@/$(MAX_GECKO_VERSION)/g; \
		s/\@MIN_GECKO_VERSION\@/$(MIN_GECKO_VERSION)/g; \
	" < $< > $@

standalone/moonlight-media-player.desktop: standalone/moonlight-media-player.desktop.in
	cp $< $@
	echo "MimeType=`grep -E '^[[:space:]]*\"[a-z]+\/[a-z\-]+\"' < content/moon-media-extension.js | sed 's,[^a-z\/\-],,g' | awk '{printf $$1 ";"}'`" >> $@

$(XPI_FILE): install.rdf standalone/application.ini standalone/moonlight-media-player.desktop
	rm -f $@
	zip -oqrX9 $@ $(DIST_FILES) -x "*/.svn/*" -x "*test-moon-console.html" -x "*standalone/extensions*" -x "*standalone/updates*" -x "*.in"

web/index.html: index.html.in
	sed -e " \
		s/\@VERSION\@/$(VERSION)/g; \
		s/\@XPI_SHA1_HASH\@/`sha1sum $(XPI_FILE) | cut -f1 -d' '`/g; \
		s/\@XPI_FILE\@/$(XPI_FILE)/g; \
	" < $< > $@

web-dist: dist xpi
	rm -rf web
	mkdir web

web: web-dist web/index.html
	cp skin/icon.png web
	mv $(XPI_FILE) $(PACKAGE)-$(VERSION).tar.bz2 web

push: web
	ssh abock@getbanshee.org rm -rf /home/abock/public_html/moon-media
	scp -r web abock@getbanshee.org:public_html/moon-media

xpi: $(XPI_FILE)

dist: clean
	rm -rf _dist; \
	mkdir -p _dist/$(PACKAGE)-$(VERSION); \
	find . -maxdepth 1 -not -name _dist -and -not -name . -and -not -name $(PACKAGE)* -exec cp -a {} _dist/$(PACKAGE)-$(VERSION) \;; \
	find _dist -type d -iregex '.*\.svn$$' | xargs rm -rf; \
	cd _dist; \
	tar cfj ../$(PACKAGE)-$(VERSION).tar.bz2 $(PACKAGE)-$(VERSION)
	rm -rf _dist

clean:
	rm -rf $(CLEAN_FILES)

run:
	MOZ_PLUGIN_PATH=/usr/lib/moon/plugin xulrunner standalone/application.ini

install-dev:
	@ff_path=$$HOME/.mozilla/firefox; \
	profiles=(`grep Path= $${ff_path}/profiles.ini | cut -f2 -d=`); \
	echo "Which Firefox profile would you like to use for development?"; \
	echo; \
	i=0; \
	for ((i=0;i<$${#profiles[@]};i++)); do \
		echo "  $${i}) `echo $${profiles[$${i}]} | cut -f2 -d.`"; \
	done; \
	echo; \
	read -p "Profile Number: " profile_number; \
	echo; \
	profile=$${profiles[$${profile_number}]}; \
	profile_name=`echo $${profile} | cut -f2 -d.`; \
	[[ -z "$${profile}" ]] && { \
		echo "Invalid profile selection"; \
		echo; \
		exit 1; \
	}; \
	extensions_path="$${ff_path}/$${profile}/extensions"; \
	mkdir -p "$${extensions_path}"; \
	echo "`pwd`/" > "$${extensions_path}/moon-media@mono-project.com"; \
	echo "Extension installed in development mode for '$${profile_name}' profile"; \
	echo "Launch firefox using 'firefox -P $${profile_name} -no-remote'"; \
	echo

