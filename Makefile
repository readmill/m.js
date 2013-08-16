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

define USAGE
Usage instructions:
    make serve                runs a development server on port 8000
    make serve PORT=[port]    runs a development server on the port specified
    make test                 runs the test suite using phantomjs
    make test GREP=[filter]   runs the tests matching filter
    make clean                removes the pkg directory
    make build                creates a development build
    make package              creates a production (minified) build
    make help                 displays this message
endef
export USAGE

PKGDIR = pkg
MAXOUT = $(PKGDIR)/m.js
MINOUT = $(PKGDIR)/m.min.js
PORT ?= 8000

default: help

help:
	@echo "$$USAGE"

pkgdir:
	@mkdir -p $(PKGDIR)

clean:
	@rm -rf $(PKGDIR)

build: pkgdir
	@rm -f $(MAXOUT)
	@echo "$$HEADER" > $(MAXOUT)
	@cat lib/m.js lib/m/{create,remove,sandbox,events,module}.js >> $(MAXOUT)
	@echo Created $(MAXOUT)

package: clean build
	@`npm bin`/uglifyjs $(MAXOUT) --mangle --comments '/Copyright \d{4}/' --output $(MINOUT)
	@cat $(MINOUT) | gzip -c > $(MINOUT).gz
	@echo "Built files..."
	@ls -lahS pkg/*.{js,gz} | awk '{printf "%s\t%s\n", $$9, $$5}'
	@rm $(MINOUT).gz

	@zip -qj $(PKGDIR)/m.zip $(MAXOUT) $(MINOUT) LICENSE
	@echo "Created $(PKGDIR)/m.zip"

test:
	@phantomjs test/index.js $(GREP)

serve:
	@echo "Tests are available at http://localhost:$(PORT)/test/index.html"
	@python -m SimpleHTTPServer $(PORT)

lint:
	@`npm bin`/jshint -c jshint.json lib/**/*.js

.PHONY: pkgdir clean build package test serve lint
