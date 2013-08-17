describe('m.module()', function () {
  var module = m.module;
  var Module = module.Module;
  var ModuleFactory = module.ModuleFactory;

  beforeEach(function () {
    module.registry = {};
    module.instances = {};

    this.let('factory', function () {
      return (new module.ModuleFactory('test')).build();
    });
    this.let('element', function () {
      return document.createElement('div');
    });
    this.let('instance', function () {
      return this.factory.create({el: this.element});
    });
    this.let('fixture', function () {
      return document.createElement('div');
    });

    document.body.appendChild(this.fixture);
  });

  afterEach(function () {
    this.fixture.parentNode.removeChild(this.fixture);
  });

  it('adds a new item to the module.registry', function () {
    module('test', {});

    var test = module.registry.test;
    assert.instanceOf(test, ModuleFactory);
  });

  it('creates a new ModuleFactory instance', function () {
    var instance = new ModuleFactory('name');
    var target = sinon.stub(module, 'ModuleFactory').returns(instance);

    module('name');
    assert.calledWithNew(target);
    assert.calledWith(target, 'name', module.find);

    target.restore();
  });

  it('passes the methods into the ModuleFactory instance', function () {
    var methods = {method1: 'method1'};
    var instance = new ModuleFactory('name');
    var target = sinon.stub(instance, 'methods');

    sinon.stub(module, 'ModuleFactory').returns(instance);

    module('name', methods);
    assert.called(target);
    assert.calledWith(target, {method1: 'method1'});

    module.ModuleFactory.restore();
  });

  it('throws an exception if the module is already defined', function () {
    module('name', this.factory);
    assert.throws(function () {
      module('name', this.factory);
    });
  });

  it('returns the newly created object', function () {
    var instance = new ModuleFactory('name');
    var target = sinon.stub(module, 'ModuleFactory').returns(instance);
    assert.equal(module('name', this.factory), instance);
    target.restore();
  });

  describe('.find()', function () {
    beforeEach(function () {
      this.let('example', new ModuleFactory('example'));
      module.registry.example = this.example;
    });

    it('finds an item in the module registry', function () {
      assert.equal(module.find('example'), this.example);
    });

    it('returns null if no module is found', function () {
      assert.isNull(module.find('non-existant'));
    });
  });

  describe('.create()', function () {
    it('creates a new instance of the module with the element', function () {
      module('my-new-module');
      var element = document.createElement('div');
      var options = {batman: 'two-face'};
      var result  = module.create('my-new-module', element, options);
      assert.equal(result.el, element);
      assert.equal(result.type(), 'my-new-module');
      assert.equal(result.options.batman, 'two-face');
    });
  });

  describe('.initialize()', function () {
    beforeEach(function () {
      this.let('element1', jQuery('<div data-test1>').appendTo(this.fixture));
      this.let('element2', jQuery('<div data-test1>').appendTo(this.fixture));
      this.let('element3', jQuery('<div data-test2>').appendTo(this.fixture));

      this.let('test1', function () {
        return new ModuleFactory('test1', {});
      });

      // Add test1 to the registry.
      module.registry = {
        test1: this.test1
      };

      this.let('target', sinon.stub(module, 'instance'));
    });

    afterEach(function () {
      this.target.restore();
    });

    it('finds all elements with the `data-*` attribute', function () {
      module.initialize(this.fixture);
      assert.called(this.target);
    });

    it('skips modules that are not functions', function () {
      module.initialize(this.fixture);
      assert.calledTwice(this.target);
    });

    it('calls module.instance() with the element and factory', function () {
      module.initialize(this.fixture);
      assert.calledWith(this.target, this.test1, this.element1[0]);
      assert.calledWith(this.target, this.test1, this.element2[0]);
    });

    describe('', function () {
      beforeEach(function () {
        this.let('delegate', sinon.stub(module, 'delegate'));
      });

      afterEach(function () {
        this.delegate.restore();
      });

      it('delegates initilization to the document if events are provided', function () {
        this.test1.events = [{}];
        module.initialize(this.fixture);
        assert.called(this.delegate);
      });

      it('does not initialize the module if it is has been deferred', function () {
        this.test1.events = [{}];
        module.initialize(this.fixture);
        assert.notCalled(this.target);
      });
    });

    it('returns the module object', function () {
      assert.equal(module.initialize(), module);
    });
  });

  describe('.instance()', function () {
    beforeEach(function () {
      this.element = document.createElement('div');
      this.factory = new ModuleFactory('test');
      this.factory.options = this.defaults = {test1: 'a', test2: 'b', test3: 'c'};

      this.sandbox = {
        i18n: {
          translate: sinon.spy()
        }
      };
      sinon.stub(m, 'sandbox').returns(this.sandbox);

      this.module = Module.extend();
      this.instance = new this.module({el: this.element});

      sinon.stub(this.module, 'create', function () {
        return this.instance;
      }.bind(this));
      sinon.stub(this.factory, 'build').returns(this.module);

      this.extractedOptions = {test1: 1, test2: 2};
      sinon.stub(this.factory, 'extract').returns(this.extractedOptions);
    });

    afterEach(function () {
      m.sandbox.restore();
      this.factory.extract.restore();
    });

    it('extract the options from the element', function () {
      module.instance(this.factory, this.element);

      assert.called(this.factory.extract);
      assert.calledWith(this.factory.extract, this.element);
    });

    it('not modify the defaults object', function () {
      var clone = _.extend({}, this.defaults);
      module.instance(this.factory, this.element);

      assert.deepEqual(this.defaults, clone);
    });

    it('create a sandbox object', function () {
      module.instance(this.factory, this.element);
      assert.called(m.sandbox);
    });

    it('initialize the module factory with the sandbox, options and translate function', function () {
      module.instance(this.factory, this.element);

      assert.called(this.module.create);
      assert.calledWith(this.module.create, _.extend({}, this.extractedOptions, {
        el: this.element,
        sandbox: this.sandbox
      }));
    });

    it('calls the module.run() method', function () {
      var target = sinon.stub(this.instance, 'run');
      module.instance(this.factory, this.element);

      assert.called(target);
    });

    it('listens for the remove event and unbinds the listeners', function () {
      var target = sinon.stub(module, 'removeInstance');
      module.instance(this.factory, this.element);

      this.instance.emit('remove');
      assert.called(target);
      assert.calledWith(target, this.instance);

      target.restore();
    });

    it('it adds the instance to the module cache', function () {
      var target = sinon.stub(module, 'addInstance');
      module.instance(this.factory, this.element);

      assert.called(target);
      assert.calledWith(target, this.instance);

      target.restore();
    });

    it('simply calls run() if the module already exists', function () {
      module.instances.test = [this.instance];

      var target = sinon.stub(this.instance, 'run');
      module.instance(this.factory, this.element);

      assert.called(target);
      assert.notCalled(this.factory.build);
    });

    it('returns the newly created instance', function () {
      var instance = module.instance(this.factory, this.element);
      assert.instanceOf(instance, Module);
    });
  });

  describe('.delegate()', function () {
    beforeEach(function () {
      this.let('document', jQuery(document));
      this.let('factory', new ModuleFactory('test'));
      this.let('events', [{on: 'click'}, {on: 'keypress'}]);

      this.factory.events = this.events;

      sinon.stub(jQuery.fn, 'init').returns(this.document);
      sinon.stub(this.document, 'on');
    });

    afterEach(function () {
      jQuery.fn.init.restore();
    });

    it('registers an event handler on the document for each event', function () {
      module.delegate(this.factory);
      assert.calledTwice(this.document.on);
    });

    it('passes in the factory and options as data properties of the event', function () {
      module.delegate(this.factory);
      assert.calledWith(this.document.on, 'click', '[data-test]', {
        factory: this.factory,
        options: this.events[0]
      }, module.delegateHandler);
    });

    it('sets the `hasDelegated` flag on the factory', function () {
      module.delegate(this.factory);
      assert.isTrue(this.factory.hasDelegated);
    });

    it('does nothing if the `hasDelegated` flag is set on the factory', function () {
      this.factory.hasDelegated = true;
      module.delegate(this.factory);
      assert.notCalled(this.document.on);
    });
  });

  describe('module.delegateHandler', function () {
    beforeEach(function () {
      this.let('element', document.createElement('div'));
      this.let('factory', new ModuleFactory('test'));
      this.let('event', function () {
        return jQuery.Event('click', {currentTarget: this.element, data: {factory: this.factory, options: {}}});
      });

      sinon.stub(module, 'instance');
    });

    afterEach(function () {
      module.instance.restore();
    });

    it('instantiates the module with the factory and current event target', function () {
      module.delegateHandler(this.event);
      assert.calledWith(module.instance, this.factory, this.element);
    });

    it('prevents the default event action', function () {
      module.delegateHandler(this.event);
      assert.isTrue(this.event.isDefaultPrevented());
    });

    it('does not prevent the default event action if options.preventDefault is false', function () {
      this.event.data.options.preventDefault = false;
      module.delegateHandler(this.event);
      assert.isFalse(this.event.isDefaultPrevented());
    });

    it('does not try to call options.callback if it is not a function', function () {
      [null, undefined, 'string', 10, false, true].forEach(function (value) {
        var event = this.event;
        event.data.options.callback = value;

        assert.doesNotThrow(function () {
          module.delegateHandler(event);
        });
      }, this);
    });

    it('does nothing if the meta key is held down', function () {
      this.event.metaKey = true;
      module.delegateHandler(this.event);
      assert.notCalled(module.instance);
    });
  });

  describe('.findInstance()', function () {
    it('finds an instance for the factory and element provided', function () {
      module.instances.test = [this.instance];
      var target = module.findInstance(this.factory, this.element);
      assert.strictEqual(target, this.instance);
    });

    it('returns null if no instance can be found', function () {
      var target = module.findInstance(this.factory, this.element);
      assert.isNull(target);
    });
  });

  describe('.addInstance()', function () {
    it('adds the instance to the module.instances cache', function () {
      var target = module.addInstance(this.instance);
      assert.deepEqual(module.instances.test, [this.instance]);
    });

    it('creates the array if it does not already exist', function () {
      var target = module.addInstance(this.instance);
      assert.deepEqual(module.instances.test, [this.instance]);
    });
  });

  describe('.removeInstance()', function () {
    beforeEach(function () {
      module.instances.test = [this.instance];
    });

    it('removes the instance from the cache', function () {
      module.removeInstance(this.instance);
      assert.deepEqual(module.instances.test, []);
    });
  });

  describe('.lookup()', function () {
    beforeEach(function () {
      module.instances.test = [this.instance];
    });

    it('returns all modules for the element provided', function () {
      var result = module.lookup(this.instance.el);
      assert.deepEqual(result, [this.instance]);
    });

    it('returns an empty array if no elements are found', function () {
      var result = module.lookup(document.createElement('a'));
      assert.deepEqual(result, []);
    });

    it('returns the exact module if a type is provided', function () {
      var result = module.lookup(this.instance.el, 'test');
      assert.equal(result, this.instance);
    });

    it('returns null if the module was not found for the element provided', function () {
      var result = module.lookup(this.instance.el, 'non-existant');
      assert.isNull(result);
    });
  });

  describe('.mixin()', function () {
    it('extends the Module prototype', function () {
      var methods = {method1: function () {}, prop1: 'property'};

      module.mixin(methods);

      assert.propertyVal(Module.prototype, 'prop1', 'property');
      assert.propertyVal(Module.prototype, 'method1', methods.method1);
    });

    it('throws an error if the property has already been set', function () {
      Module.prototype.method1 = function () {};

      assert.throws(function () {
        module.mixin({method1: function () {}});
      });
    });
  });

  describe('ModuleFactory()', function () {
    beforeEach(function () {
      this.let('name', 'example');
      this.let('findModule', sinon.spy());
      this.let('methods', function () {
        return {};
      });
      this.let('subject', function () {
        return new ModuleFactory(this.name, this.findModule);
      });
    });

    it('throws an error if no type is provided', function () {
      assert.throws(function () {
        new ModuleFactory();
      });
    });

    it('has a type property', function () {
      assert.equal(this.subject.type, 'example');
    });

    it('has a data property', function () {
      assert.equal(this.subject.namespace, 'data-example');
    });

    it('has a selector property', function () {
      assert.equal(this.subject.selector, '[data-example]');
    });

    it('sets the findModule() method to the passed function', function () {
      assert.equal(this.subject.findModule, this.findModule);
    });

    it('does not set the findModule() method if no function is provided', function () {
      this.findModule = null;
      assert.isFalse(_.has(this.subject, 'findModule'), 'subject should not have own property findModule');
    });

    describe('.build()', function () {
      it('builds a new Module instance', function () {
        assert.instanceOf(this.subject.build().prototype, Module);
      });

      it('returns the same object if called more than once', function () {
        assert.strictEqual(this.subject.build(), this.subject.build());
      });

      it('returns a new object if the force option is true', function () {
        var first = this.subject.build();
        var second = this.subject.build({force: true});
        assert.notStrictEqual(first, second);
      });

      it('uses the parent if provided', function () {
        var target = this.subject.parent = new ModuleFactory('parent').build();
        assert.instanceOf(this.subject.build().prototype, target);
      });

      it('extends the prototype with properties if provided', function () {
        function method1() {}
        this.subject.properties.method1 = method1;
        assert.strictEqual(this.subject.build().prototype.method1, method1);
      });

      it('creates a named constructor function', function () {
        var constructor = this.subject.build();
        assert.equal(constructor.name, 'ExampleModule');
      });
    });

    describe('.extend()', function () {
      it('sets the parent property to the child Module provided', function () {
        var ParentModule = Module.extend();
        this.subject.extend(ParentModule);
        assert.strictEqual(this.subject.parent, ParentModule);
      });

      it('throws an error if the parent is not a Module constructor', function () {
        _.each([null, 'test', new Module(), new ModuleFactory('fake'), ModuleFactory], function (parent) {
          assert.throws(function () {
            this.subject.extend(parent);
          }.bind(this));
        }, this);
      });

      it('uses the findModule() function to lookup a string', function () {
        var ParentModule = Module.extend();
        this.findModule = sinon.stub().returns(ParentModule);

        this.subject.extend(ParentModule);
        assert.strictEqual(this.subject.parent, ParentModule);
      });

      it('returns itself', function () {
        var ParentModule = Module.extend();
        assert.strictEqual(this.subject.extend(ParentModule), this.subject);
      });
    });

    describe('.methods()', function () {
      it('extends the properties object with the new methods', function () {
        function myMethod() {}

        this.subject.methods({
          prop: 'my-prop',
          method: myMethod
        });

        assert.propertyVal(this.subject.properties, 'prop', 'my-prop');
        assert.propertyVal(this.subject.properties, 'method', myMethod);
      });

      it('throws an error if a property is added twice', function () {
        this.subject.properties.prop = 'exists';
        assert.throws(function () {
          this.subject.methods({
            prop: 'my-prop'
          });
        }.bind(this));
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.methods(), this.subject);
      });
    });

    describe('.mixin()', function () {
      it('is an alias for .methods()', function () {
        assert.strictEqual(this.subject.mixin, this.subject.methods);
      });
    });

    describe('.options()', function () {
      it('sets the default options for the module', function () {
        this.subject.options({
          limit: 5,
          offset: 2,
          url: 'http://example.com'
        });

        assert.propertyVal(this.subject.defaults, 'limit', 5);
        assert.propertyVal(this.subject.defaults, 'offset', 2);
        assert.propertyVal(this.subject.defaults, 'url', 'http://example.com');
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.options({limit: '5'}), this.subject);
      });
    });

    describe('.defer()', function () {
      it('pushes the event into the events queue', function () {
        var event = {on: 'click', preventDefault: false};
        this.subject.defer(event);

        assert.include(this.subject.events, event);
      });

      it('throws an error if the "on" property is missing', function () {
        var event = {preventDefault: false};

        assert.throws(function () {
          this.subject.defer(event);
        }.bind(this));
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.defer({on: 'click'}), this.subject);
      });
    });

    describe('.isDeferred()', function () {
      it('returns true if the factory has registered events', function () {
        this.subject.events.push({});
        assert.isTrue(this.subject.isDeferred());
      });

      it('returns false if the factory has no registered events', function () {
        assert.isFalse(this.subject.isDeferred());
      });
    });

    describe('.extract()', function () {
      it('extracts the data keys from the element', function () {
        var element = jQuery('<div>', {
          'data-not-module': 'skip',
          'data-example': 'skip',
          'data-example-a': 'capture',
          'data-example-b': 'capture',
          'data-example-c': 'capture'
        })[0];

        var target = this.subject.extract(element);
        assert.deepEqual(target, {a: 'capture', b: 'capture', c: 'capture'});
      });

      it('converts JSON contents of keys into JS primitives', function () {
        var element = jQuery('<div>', {
          'data-example-null': 'null',
          'data-example-int': '100',
          'data-example-arr': '[1, 2, 3]',
          'data-example-obj': '{"a": 1, "b":2, "c": 3}',
          'data-example-str': 'hello'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'null': null,
          'int': 100,
          'arr': [1, 2, 3],
          'obj': {"a": 1, "b": 2, "c": 3},
          'str': 'hello'
        });
      });

      it('uses strings for content that it cannot parse as JSON', function () {
        var element = jQuery('<div>', {
          'data-example-url': 'http://example.com/path/to.html',
          'data-example-bad': '{oh: 1, no'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'url': 'http://example.com/path/to.html',
          'bad': '{oh: 1, no'
        });
      });

      it('converts keys with hyphens into camelCase', function () {
        var element = jQuery('<div>', {
          'data-example-long-property': 'long',
          'data-example-really-very-long-property': 'longer'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'longProperty': 'long',
          'reallyVeryLongProperty': 'longer'
        });
      });

      it('handles modules with hyphens in the name', function () {
        this.name = 'long-example';

        var element = jQuery('<div>', {
          'data-long-example-long-property': 'long',
          'data-long-example-really-very-long-property': 'longer'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'longProperty': 'long',
          'reallyVeryLongProperty': 'longer'
        });
      });

      it('sets boolean attributes to true', function () {
        var element = jQuery('<div>', {
          'data-example-long-property': ''
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {'longProperty': true});
      });
    });
  });

  describe('Module()', function () {
    beforeEach(function () {
      this.let('el', jQuery('<div />')[0]);
      this.let('sandbox', m.sandbox());
      this.let('options', function () {
        return {el: this.el, sandbox: this.sandbox};
      });

      this.let('subject', function () {
        return new Module(this.options);
      });
    });

    it('is an instance of Broadcast', function () {
      assert.instanceOf(this.subject, window.Broadcast);
    });

    it('assigns .el as the element option', function () {
      assert.ok(this.subject.el === this.el);
    });

    it('wraps .$el in jQuery if not already wrapped', function () {
      assert.ok(this.subject.$el instanceof jQuery);
    });

    it('assigns the sandbox property', function () {
      assert.equal(this.subject.sandbox, this.sandbox);
    });

    it('assigns a cid property', function () {
      assert.match(this.subject.cid, /base:\d+/);
    });

    it('assigns the options property', function () {
      this.options['foo'] = 'bar';
      assert.equal(this.subject.options.foo, 'bar');
      assert.notEqual(this.subject.options, Module.prototype.options);
    });

    it('triggers the "module:create" event if sandbox.publish exists', function () {
      var target = sinon.spy();

      this.sandbox = {publish: target};
      var subject = this.subject;
      assert.called(target);
      assert.calledWith(target, 'module:create', this.options, this.subject);
    });

    it('initializes the module', function () {
      var target = sinon.spy();
      var ChildModule = Module.extend({initialize: target});

      new ChildModule();
      assert.called(target);
    });

    it('sets up the event handlers', function () {
      var target = sinon.spy();
      var ChildModule = Module.extend({
        events: {click: '_onClick'},
        _onClick: target
      });

      var childModule = new ChildModule();
      childModule.$el.click();
      assert.called(target);
    });

    it('tears down when module element is removed', function () {
      var target = this.subject.teardown = sinon.spy();
      this.fixture.appendChild(this.subject.el);
      this.subject.$el.remove();
      assert.called(target);
    });

    describe('.$()', function () {
      it('find children within the module element', function () {
        this.subject.$el.append(jQuery('<input /><input />'));
        assert.equal(this.subject.$('input').length, 2);
      });
    });

    describe('.type()', function () {
      it('returns the module factory type', function () {
        assert.equal(this.subject.type(), 'base');
      });
    });

    describe('.run()', function () {
      it('simply returns itself', function () {
        assert.strictEqual(this.subject.run(), this.subject);
      });
    });

    describe('.html()', function () {
      it('sets the html of the element', function () {
        var html = '<div data-superman="yes">Superman lives here</div>';
        this.subject.html(html);
        assert.equal(this.subject.$el.html(), html);
      });

      it('triggers the "module:html" event if sandbox.publish exists', function () {
        var target = sinon.spy();

        this.subject.sandbox = {publish: target};
        this.subject.html('<div></div>');
        assert.called(target);
        assert.calledWith(target, 'module:html', '<div></div>', this.subject);
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.html(), this.subject);
      });
    });

    describe('.initialize()', function () {
      it('exists as a no-op', function () {
        assert.isFunction(this.instance.initialize);
      });
    });

    describe('.teardown()', function () {
      it('exists as a no-op', function () {
        assert.isFunction(this.instance.teardown);
      });
    });

    describe('.remove()', function () {
      it('tears down the module', function () {
        var target = sinon.stub(this.subject, 'teardown');
        this.subject.remove();

        assert.called(target);
      });

      it('triggers the "remove" event on itself', function () {
        var target = sinon.spy();
        this.subject.addListener('remove', target);

        this.subject.remove();
        assert.called(target);
        assert.calledWith(target, this.subject);
      });

      it('triggers the "module:remove" event if sandbox.publish exists', function () {
        var target = sinon.spy();

        this.subject.sandbox = {publish: target};
        this.subject.remove();
        assert.called(target);
        assert.calledWith(target, 'module:remove', this.subject);
      });

      it('removes the element from the page', function () {
        this.fixture.appendChild(this.subject.el);
        this.subject.remove();

        assert.equal(this.fixture.children.length, 0);
      });
    });

    describe('.delegateEvents()', function () {
      it('binds a handler for an event on the module element', function () {
        var target = this.subject._onClick = sinon.spy();

        this.subject.delegateEvents({'click': '_onClick'});
        this.subject.$el.click();

        assert.called(target);
      });

      it('delegates a handler for an event on a child element', function () {
        var target = this.subject._onClick = sinon.spy();
        this.subject.el.appendChild(document.createElement('span'));

        this.subject.delegateEvents({'click span': '_onClick'});
        this.subject.$('span').click();

        assert.called(target);
      });

      it('binds the handler to the module scope', function () {
        var target = this.subject._onClick = sinon.spy();

        this.subject.delegateEvents({'click': '_onClick'});
        this.subject.$el.click();

        assert.calledOn(target, this.subject);
      });

      it('accepts a function rather than a method name', function () {
        var target = sinon.spy();

        this.subject.delegateEvents({'click': target});
        this.subject.$el.click();

        assert.called(target);
      });

      it('unbinds all existing delegated events', function () {
        var target = sinon.spy();

        this.subject.delegateEvents({'click': target});
        this.subject.delegateEvents();
        this.subject.$el.click();

        assert.notCalled(target);
      });
    });

    describe('.undelegateEvents()', function () {
      it('unbinds listeners bound using .delegateEvents()', function () {
        var target = sinon.spy();

        this.subject.delegateEvents({'click': target});
        this.subject.undelegateEvents();
        this.subject.$el.click();

        assert.notCalled(target);
      });

      it('does not unbind other listeners', function () {
        var target = sinon.spy();

        this.subject.$el.on('click', target);
        this.subject.undelegateEvents();
        this.subject.$el.click();

        assert.called(target);
      });
    });
  });

  describe('m.events.on(module:remove)', function () {
    it('removes all handlers registered by the sandbox', function () {
      var target = sinon.spy();
      m.events.publish('module:remove', {sandbox: {unsubscribe: target}});

      assert.called(target);
      assert.calledWithExactly(target);
    });
  });

  describe('m.events.on(module:html)', function () {
    it('reinitializes the module', function () {
      var target = sinon.stub(m.module, 'initialize');
      var el = document.createElement('div');
      m.events.publish('module:html', '<div>NewHTML</div>', {el: el});
      assert.calledWith(target, el);
      target.restore();
    });
  });
});
