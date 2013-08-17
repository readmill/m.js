describe('m.events', function () {
  var events = m.events;
  var callbacks = events._callbacks; // Cache the original callbacks.

  afterEach(function () {
    events._callbacks = callbacks;
  });

  it('is an instance of Events', function () {
    assert.instanceOf(events, m.Events);
  });

  describe('', function () {
    beforeEach(function () {
      this.handler1 = sinon.spy();
      this.handler2 = sinon.spy();
      this.handler3 = sinon.spy();

      events.subscribe('dropdown:open', this.handler1);
      events.subscribe('dropdown:close', this.handler2);
      events.subscribe('search:submit', this.handler3);
    });

    describe('.pause()', function () {
      it('prevents events being published', function () {
        events.pause();
        events.publish('dropdown:open');
        events.publish('dropdown:close');
        events.publish('search:submit');

        assert.notCalled(this.handler1);
        assert.notCalled(this.handler2);
        assert.notCalled(this.handler3);
        events.resume();
      });

      it('allows module:* events through', function () {
        var handler = sinon.spy();

        events.subscribe('module:create', handler);

        events.pause();
        events.publish('module:create');

        assert.called(handler);
        events.resume();
      });
    });

    describe('.resume()', function () {
      it('republishes all cached events', function () {
        events.pause();
        events.publish('dropdown:open');
        events.publish('dropdown:close');
        events.publish('search:submit');
        events.resume();

        assert.called(this.handler1);
        assert.called(this.handler2);
        assert.called(this.handler3);
      });
    });
  });

  describe('SandboxEvents()', function () {
    beforeEach(function () {
      this.let('instance', function () {
        return new m.SandboxEvents(events);
      });
    });

    describe('.publish()', function () {
      it('publishes an event on the events object', function () {
        var calls = [
          [['dropdown:open'], sinon.spy()],
          [['dropdown:toggle', true], sinon.spy()],
          [['dropdown', {}, [], 10, 'string', null], sinon.spy()]
        ];

        _.each(calls, function (call) {
          var spy  = call[1];
          var args = call[0];
          var name = args[0];

          events.addListener(name, spy);
          this.instance.publish.apply(this.instance, args);

          assert.calledWith.apply(assert, [spy].concat(args.slice(1)));
        }, this);
      });
    });

    describe('.subscribe()', function () {
      beforeEach(function () {
      });

      it('registers a handler for the event on the events object', function () {
        var handler = sinon.spy();
        this.instance.subscribe('dropdown:open', handler);

        events.publish('dropdown:open');

        assert.called(handler);
      });

      it('allows the context to be provided', function () {
        var handler = sinon.spy();
        var context = {};
        this.instance.subscribe('dropdown:open', handler, context);

        events.publish('dropdown:open');

        assert.calledOn(handler, context);
      });

      it('allows the context to be falsy', function () {
        var handler = sinon.spy();
        this.instance.subscribe('dropdown:open', handler, null);

        events.publish('dropdown:open');

        assert.calledOn(handler, window);
      });
    });

    describe('.unsubscribe()', function () {
      beforeEach(function () {
        this.handler1 = sinon.spy();
        this.handler2 = sinon.spy();

        this.instance.subscribe('dropdown:open', this.handler1);
        this.instance.subscribe('dropdown:open', this.handler2);
      });

      it('removes the registered listener for the event', function () {
        this.instance.unsubscribe('dropdown:open', this.handler1);

        events.publish('dropdown:open');

        assert.notCalled(this.handler1);
        assert.called(this.handler2);
      });

      it('removes all the registered listeners for the event', function () {
        this.instance.unsubscribe('dropdown:open');

        events.publish('dropdown:open');

        assert.notCalled(this.handler1);
        assert.notCalled(this.handler2);
      });

      it('does not remove other listeners for other events', function () {
        this.handler3 = sinon.spy();
        this.instance.subscribe('search:submit', this.handler3);

        this.instance.unsubscribe('dropdown:open');

        events.publish('dropdown:open');
        events.publish('search:submit');

        assert.notCalled(this.handler1);
        assert.notCalled(this.handler2);
        assert.called(this.handler3);
      });

      it('removes all the registered listeners', function () {
        this.handler3 = sinon.spy();
        this.instance.subscribe('search:submit', this.handler3);

        this.instance.unsubscribe();

        events.publish('dropdown:open');
        events.publish('search:submit');

        assert.notCalled(this.handler1);
        assert.notCalled(this.handler2);
        assert.notCalled(this.handler3);
      });

      it('does not remove other listeners from other modules', function () {
        this.handler3 = sinon.spy();
        events.subscribe('dropdown:open', this.handler3);

        this.instance.unsubscribe();

        events.publish('dropdown:open');

        assert.notCalled(this.handler1);
        assert.notCalled(this.handler2);
        assert.called(this.handler3);
      });
    });
  });

  describe('sandbox.setup()', function () {
    it('applies a sandbox instance to the instance', function () {
      var sandbox = m.sandbox();
      var prototype = m.SandboxEvents.prototype;
      assert.equal(sandbox.publish, prototype.publish);
      assert.equal(sandbox.subscribe, prototype.subscribe);
      assert.equal(sandbox.unsubscribe, prototype.unsubscribe);
    });
  });
});
