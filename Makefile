PKGDIR = pkg
PORT ?= 8000

default: build

pkgdir:
	@rm -r $(PKGDIR)
	@mkdir -p $(PKGDIR)

concat: pkgdir
	@cat lib/m.js lib/m/{create,remove,sandbox,events,module}.js > $(PKGDIR)/m.js
	@echo Created $(PKGDIR)/m.js

minify: concat
	@`npm bin`/uglifyjs $(PKGDIR)/m.js -o $(PKGDIR)/m.min.js
	@echo Created $(PKGDIR)/m.min.js

test:
	@echo "Tests are available at http://localhost:$(PORT)/test"
	@python -m SimpleHTTPServer $(PORT)

lint:
	@`npm bin`/jshint -c jshint.json lib/**/*.js

build: concat minify

.PHONY: pkgdir concat minify build test lint
