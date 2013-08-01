// Allow for creating of test variables with lazy subject evaluation in the
// style of RSpecs let and subject. The named property is set to either a
// static value, or a factory function which is lazily evaluated and memoized.
//
// Examples
//
//   var obj = let({});
//
//   obj.let('target', 'boom')
//   obj.target // => 'boom'
//
//   obj.target = 4
//   obj.target // => 4
//
//   obj.target = -> Math.random()
//   obj.target # => 0.1856299617793411
//   obj.target # => 0.1856299617793411
//
//   obj.fixture = 'fixture'
//   obj.target = -> @fixture == 'fixture' # => true
//
// Returns context.
function let(context) {
  var cache = [];

  context.let = function (name, value) {
    var subject = arguments.length === 2 ? value : null;
    var isMemoized = false;

    cache.push(name);

    Object.defineProperty(context, name, {
      get: function () {
        if (isMemoized) { return subject; }
        var isFunction = typeof subject === 'function';
        var isMocked = isFunction && typeof subject.getCall === 'function';

        isMemoized = true;

        // If this is a plain function then call it and return the value. This
        // allows object initialization to be deferred. However if it's a
        // sinon mock then just let it be.
        return subject = isFunction && !isMocked ? subject.call(this) : subject;
      },
      set: function (value) {
        subject = value;
        isMemoized = false;
      },
      configurable: true
    });
  };

  // Clean up all test variables lazy evaluated with this.let().
  // This can be called in afterEach() to clean up after each test,
  // so that tests do not pollute each other.
  //
  // Examples
  //
  //   obj.let.restore() // Cleans up lazily-loaded variables in obj.
  //
  // Returns nothing.
  context.let.restore = function () {
    while (cache.length) {
      delete context[cache.pop()];
    }
  };

  return context;
}
