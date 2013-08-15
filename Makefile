json = $(shell node -p -e 'require("./package.json").$(1)')

NAME      = $(call json,name)
VERSION   = $(call json,version)
LICENSE   = $(call json,license)
HOMEPAGE  = $(call json,homepage)
COPYRIGHT = 2012-$(shell date -j -f "%a %b %d %T %Z %Y" "`date`" "+%Y")

define HEADER
/*  $(NAME).js - v$(VERSION)
 *  Copyright $(COPYRIGHT), Readmill Network Ltd
 *  Released under the $(LICENSE) license
 *  More Information: $(HOMEPAGE)
 */
endef
export HEADER

PKGDIR = pkg
PORT ?= 8000

default: build

pkgdir:
	@mkdir -p $(PKGDIR)

clean:
	@rm -rf $(PKGDIR)

build: pkgdir
	@rm -f $(PKGDIR)/m.js
	@echo "$$HEADER" > $(PKGDIR)/m.js
	@cat lib/m.js lib/m/{create,remove,sandbox,events,module}.js >> $(PKGDIR)/m.js
	@echo Created $(PKGDIR)/m.js

package: clean build
	@`npm bin`/uglifyjs $(PKGDIR)/m.js --mangle --comments '/Copyright \d{4}/' --output $(PKGDIR)/m.min.js
	@echo Created $(PKGDIR)/m.min.js
	@zip -qj $(PKGDIR)/m.zip $(PKGDIR)/{m.js,m.min.js,LICENSE}
	@echo Created $(PKGDIR)/m.zip

test:
	@echo "Tests are available at http://localhost:$(PORT)/test"
	@python -m SimpleHTTPServer $(PORT)

lint:
	@`npm bin`/jshint -c jshint.json lib/**/*.js

.PHONY: pkgdir clean build package test lint
