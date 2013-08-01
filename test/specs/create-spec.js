describe('m.create()', function () {

  beforeEach(function () {
    this.let('properties', function () {
      return {constructor: function () {}};
    });
  });

  it('returns a constructor function', function () {
    assert.isFunction(m.create(this.properties));
  });

  it('augments the constructor prototype with properties', function () {
    function method1() {}
    function method2() {}

    this.properties.method1 = method1;
    this.properties.method2 = method2;

    var Factory = m.create(this.properties);

    assert.equal(Factory.prototype.method1, method1);
    assert.equal(Factory.prototype.method2, method2);
  });

  it('augments the constructor prototype with properties', function () {
    function method1() {}
    function method2() {}

    var Factory = m.create(this.properties, {
      method1: method1,
      method2: method2
    });

    assert.equal(Factory.method1, method1);
    assert.equal(Factory.method2, method2);
  });

  it('adds an extend function to the constrcutor', function () {
    var Factory = m.create(this.properties);
    assert.isFunction(Factory.extend);
  });

  it('throws an error if no constructor is provided', function () {
    assert.throws(function () {
      m.create();
    });

    assert.throws(function () {
      m.create({});
    });

    assert.throws(function () {
      m.create({constructor: 'string'});
    });
  });
});
