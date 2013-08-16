var BaseReporter = Mocha.reporters.Base;

function PhantomReporter(runner) {
  var color = BaseReporter.color,
      width = 75, n = -1, self = this;

  BaseReporter.apply(this, arguments);

  function log(msg, type) {
    console.log(color(type || 'medium', msg) + '^H');
  }

  function dot(color) {
    n += 1;
    if (n % width === 0) {
      log('\n  ');
    }
    log('.', color);
  }

  runner.on('start', function () {
    log('  ');
  });

  runner.on('pending', function (test) {
    dot('pending');
  });

  runner.on('pass', function (test) {
    dot('slow' === test.speed ? 'bright yellow' : test.speed);
  });

  runner.on('fail', function (test, err) {
    dot('fail');
  });

  runner.on('end', function () {
    console.log();
    self.epilogue();
    console.log('^D');
  });
};

PhantomReporter.prototype = Object.create(BaseReporter.prototype);

// Override console.log to provide slightly better string substitution.
// Still very crude and could do with improvement.
console._log = console.log;
console.warn = console.error = console.log  = function (msg) {
  var msg = typeof msg === 'undefined' ? '' : msg.toString(),
      args = [].slice.call(arguments, 1);

  msg = msg.replace(/\%([sdo])/g, function (_, c) {
    return args.length ? args.shift() : '';
  });
  console._log([msg].concat(args).join(' '));
};

// Adapted from ES5-shim https://github.com/kriskowal/es5-shim/blob/master/es5-shim.js
// es5.github.com/#x15.3.4.5
if (!Function.prototype.bind) {
  Function.prototype.bind = function bind(that) {

    var slice  = Array.prototype.slice;
    var target = this;

    if (typeof target !== "function") {
      throw new TypeError();
    }

    var args = slice.call(arguments, 1);
    var bound = function () {

      if (this instanceof bound) {

        var F = function () {};
        F.prototype = target.prototype;
        var self = new F();

        var result = target.apply(
          self,
          args.concat(slice.call(arguments))
        );
        if (Object(result) === result) {
          return result;
        }
        return self;

      } else {

        return target.apply(
          that,
          args.concat(slice.call(arguments))
        );

      }

    };

    return bound;
  };
}
