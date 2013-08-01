/* An application level event hub that can be used by libraries and modules
 * to publish events between each other. Both the hub and sandbox objects
 * share the same API, although the module event listeners are namespaced
 * to allow automatic cleanup when the module is destroyed.
 *
 * Examples
 *
 *   // Global usage:
 *   m.events.subscribe('app:setup', onSetup);
 *   m.events.publish('app:setup');
 *
 *   // In a module, the third argument lets you define a context.
 *   this.sandbox.subscribe('dropdown:open', this.onOpen, this);
 *   this.sandbox.publish('dropdown:open');
 */
(function (Broadcast, m, _) {
  // Create a happy new global event object with a familiar api.
  var hub = new Broadcast();

  /* Allow events to be paused, this will collect any events published while
   * paused and republished them when .resume() is called. This is useful
   * for initialization where you may want to wait for everything to be
   * ready before events are published.
   *
   * Returns nothing.
   */
  hub.pause = function () {
    this._deferred = this._deferred || [];
  };

  /* Resumes normal publishing of events, will flush the backlog of events
   * collected while paused.
   *
   * Returns nothing.
   */
  hub.resume = function () {
    var items = this._deferred || [];
    this._deferred = null;

    for (var index = 0, length = items.length; index < length; index += 1) {
      this.publish.apply(this, items[index]);
    }
  };

  /* Wrap the normal emit function in order to collect published events while
   * paused.
   *
   * Returns itself.
   */
  hub.publish = function (name/* , arguments... */) {
    // Allow internal module events to be whitelisted. This allows the
    // application to setup. For example listening for module:create.
    if (this._deferred && name.indexOf('module:') !== 0) {
      this._deferred.push(_.toArray(arguments));
      return this;
    }
    return this.emit.apply(this, arguments);
  };
  hub.subscribe = hub.addListener;
  hub.unsubscribe = hub.removeListener;

  m.events = hub;

  /* Another events object that publishes events to a global hub. The method
   * names are therefore different to distinguish them from their local
   * counterparts but the signatures are the same.
   */
  m.SandboxEvents = m.create({

    /* Creates a new instance of a Sandbox events object.
     *
     * globalEvents - The global Backbone.Events object.
     * localEvents  - An optional events object for testing.
     *
     * Returns an instance of SandboxEvents.
     */
    constructor: function SandboxEvents(hub) {
      this._hub = hub;
      this._namespace = _.uniqueId('.hub');
    },

    /* Publish a global event throughout the application. This method is
     * exactly the same as the Backbone.Events#trigger() method.
     *
     * name  - An event name.
     * *args - All following arguments are passed to handlers.
     *
     * Examples
     *
     *   this.publish('dropdown:open');
     *
     * Returns itself.
     */
    publish: function () {
      this._hub.publish.apply(this._hub, arguments);
      return this;
    },

    /* Subscribes to a global event. The method signature is the sames as the
     * Backbone.Events#on() method.
     *
     * event   - An event name.
     * handler - An event handler.
     * context - A context for the handler (default: this).
     *
     * Examples
     *
     *   this.subscribe('popover:open', this.close);
     *
     * Returns itself.
     */
    subscribe: function (name/* , fn, context */) {
      var args = _.toArray(arguments);

      if (!name) {
        throw new Error('sandbox.subscribe() must be called with a name argument');
      }

      args[0] = args[0] + this._namespace;
      this._hub.subscribe.apply(this._hub, args);
      return this;
    },

    /* Unsubscribes from a specific event. Has the same signature as
     * Backbone.Events#off(). Calling this with no arguments removes all
     * handlers bound by this object for all events.
     *
     * name - The event name to subscribe from.
     * handler - A specific handler to unbind.
     *
     * Examples
     *
     *   this.unsubscribe('dropdown:close');
     *
     * Returns itself.
     */
    unsubscribe: function (/* name, fn */) {
      var args = _.toArray(arguments);
      args[0] = (args[0] || '') + this._namespace;
      this._hub.unsubscribe.apply(this._hub, args);
      return this;
    }
  });

  // Extend the Sandbox with a new instance of SandboxEvents. This makes the
  // methods directly accessible on the sandbox instance.
  m.sandbox.setup(function (instance) {
    _.extend(instance, new m.SandboxEvents(m.events));
  });

})(this.Broadcast, this.m, this._);
