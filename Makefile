PKGDIR = pkg
PORT ?= 8000

default: build

pkgdir:
	@mkdir -p $(PKGDIR)

clean:
	@rm -rf $(PKGDIR)

build: pkgdir
	@rm -f $(PKGDIR)/m.js
	@cat lib/m.js lib/m/{create,sandbox,events,module}.js > $(PKGDIR)/m.js
	@echo Created $(PKGDIR)/m.js

package: clean build
	@`npm bin`/uglifyjs $(PKGDIR)/m.js -m -o $(PKGDIR)/m.min.js
	@echo Created $(PKGDIR)/m.min.js
	@zip -qj $(PKGDIR)/m.zip $(PKGDIR)/m.js $(PKGDIR)/m.min.js
	@echo Created $(PKGDIR)/m.zip

test:
	@echo "Tests are available at http://localhost:$(PORT)/test"
	@python -m SimpleHTTPServer $(PORT)

lint:
	@`npm bin`/jshint -c jshint.json lib/**/*.js

.PHONY: pkgdir build production test lint
