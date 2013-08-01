describe('m.sandbox()', function () {
  var sandbox = m.sandbox;
  var Sandbox = sandbox.Sandbox;
  var original = _.clone(Sandbox.prototype);

  afterEach(function () {
    Sandbox.prototype = original;
    sandbox.callbacks = [];
  });

  it('returns a new instance of Sandbox', function () {
    assert.instanceOf(m.sandbox(), Sandbox);
  });

  describe('.mixin()', function () {
    it('extends the Sandbox prototype', function () {
      var methods = {method1: function () {}, prop1: 'property'};

      sandbox.mixin(methods);

      assert.propertyVal(Sandbox.prototype, 'prop1', 'property');
      assert.propertyVal(Sandbox.prototype, 'method1', methods.method1);
    });

    it('throws an error if the property has already been set', function () {
      Sandbox.prototype.method1 = function () {};

      assert.throws(function () {
        sandbox.mixin({method1: function () {}});
      });
    });
  });

  describe('.setup()', function () {
    it('adds the passed function into the sandbox.callbacks array', function () {
      function myFunction() {}
      sandbox.setup(myFunction);

      assert.include(sandbox.callbacks, myFunction);
    });

    it('throws an error if a function is not provided', function () {
      assert.throws(function () {
        sandbox.setup('cats');
      });
    });
  });

  describe('Sandbox()', function () {
    it('returns a new instance of Sandbox', function () {
      assert.instanceOf(new Sandbox(), Sandbox);
    });

    it('calls each provided callback passing in itself as an argument', function () {
      var spies = [sinon.spy(), sinon.spy(), sinon.spy()];
      var target = new Sandbox(spies);

      _.each(spies, function (spy) {
        assert.calledWith(spy, target);
      });
    });
  });
});
