var fs = require('fs'),
    page = require('webpage').create(),
    server = require('webserver').create(),
    system = require('system'),
    suite, grep, hasFailed = false;

server.listen(8888, function (request, response) {
  var source;

  try {
    source = fs.read(fs.workingDirectory + request.url.split('?').shift());
  } catch (e) {}

  response.statusCode = source ? 200 : 400;
  response.write(source || '');
  response.close();
});

page.onConsoleMessage = function(msg) {
  if (msg === '^D') {
    return phantom.exit(hasFailed ? 1 : 0);
  }

  if (msg.indexOf('failing') > -1) {
    hasFailed = true;
  }

  if (msg.lastIndexOf('^H') === msg.length - 2) {
    fs.write("/dev/stdout", msg.slice(0, -2), "w");
  } else {
    console.log.apply(console, arguments);
  }
};

suite = 'http://localhost:8888/test/index.html';
grep  = phantom.args[0];
if (grep) {
  suite += '?grep=' + grep;
}

// Pass in a dom library via an environment variable.
// $ DOM_LIBRARY=zepto make test
if (system.env.DOM_LIBRARY) {
  suite += '#' + system.env.DOM_LIBRARY;
}

page.open(suite, function (status) {
  if (status !== 'success') {
    console.log('Unable to open the test suite');
    phantom.exit(1);
  }
});
