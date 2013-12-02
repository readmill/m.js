/*jshint evil:true */

/* Generic module class that acts as a base for all modules. This is
 * never created manually but build using the m.module() function. This has
 * a similar api to a Backbone.View as it provides the basics for settings up and
 * tearing down DOM elements. In addition it receives a sandbox object which is
 * it's communication with the rest of the page.
 */
(function (m, Broadcast, inherit, _) {
  var Module = inherit(Broadcast, {
    el: null,
    $el: null,
    cid: null,
    events: null,

    /* Holds an instance of the Sandbox object. */
    sandbox: null,

    /* Initializes the Module and sets up instance variables.
     *
     * options - An object of options that matches the Backbone.View API. Also
     *           requires a sandbox property to be present.
     *
     * Returns an instance of the Module.
     */
    constructor: function Module(options) {
      options = options || {};
      Broadcast.call(this);

      this.el = options.el || document.createElement('div');
      this.$el = m.$(this.el);
      this.$el.on('remove', _.bind(this.remove, this));
      this.cid = _.uniqueId(this.type() + ':');
      this.events = this.events || {};
      this.options = _.extend({}, this.options, options);

      this.sandbox = (options && options.sandbox) || null;
      if (this.sandbox && typeof this.sandbox.publish === 'function') {
        this.sandbox.publish('module:create', options, this);
      }

      this.delegateEvents(this.events);

      this.initialize();
    },

    /* Returns the type of the module */
    type: function () {
      return this.constructor.type;
    },

    /* Called after the module has been initialized and in cases of deferring
     * to click events etc, each time the event is fired.
     *
     * event - The event that fired if deferred, otherwise null.
     *
     * Returns itself.
     */
    run: function (/* event */) {
      return this;
    },

    /* Simple alias for this.$el.find(), searches the root elements for
     * children matching the selector.
     *
     * selector - A selector string.
     *
     * Returns a jQuery collection.
     */
    $: function (selector) {
      return this.$el.find(selector);
    },

    /* Updates the inner HTML of the module.
     * Publishes module:html event to rerun module.initialize on the new HTML.
     *
     * html - The HTML of the module
     *
     * Returns itself.
     */
    html: function (html) {
      this.$el.html(html);
      if (this.sandbox && typeof this.sandbox.publish === 'function') {
        this.sandbox.publish('module:html', html, this);
      }
      return this;
    },

    /* Called when the module is created. Use it to setup any state that is
     * required by the module such as sandbox subscriptions, templating etc.
     *
     * Returns nothing.
     */
    initialize: function () {},

    /* Called when the module is removed from the document. Use it to teardown
     * any state that would persist after removal. DOM event handlers and
     * sandbox events are handled for you.
     *
     * Returns nothing.
     */
    teardown: function () {},

    /* Extends the default remove method to trigger the "remove" event that is
     * used internally to tidy up event handlers.
     *
     * Returns itself.
     */
    remove: function () {
      this.$el.remove();
      this.emit('remove', this);

      if (this.sandbox && typeof this.sandbox.publish === 'function') {
        this.sandbox.publish('module:remove', this);
      }

      this.teardown();
      return this;
    },

    delegateEvents: function (events) {
      this.undelegateEvents();

      _.each(events, function (handler, key) {
        if (typeof handler !== 'function') { handler = this[handler]; }
        if (!handler) { return; }

        var parts    = key.split(' ');
        var event    = parts.shift() + '.m:delegates:' + this.cid;
        var selector = parts.join(' ');
        handler = _.bind(handler, this);

        if (selector) {
          this.$el.delegate(selector, event, handler);
        } else {
          this.$el.on(event, handler);
        }
      }, this);

      return this;
    },

    undelegateEvents: function () {
      this.$el.off('.m:delegates:' + this.cid);
      return this;
    },

    toString: function () {
      return '[object Module(type:' + this.type() + ' cid:' + this.cid + ')]';
    }
  }, {
    /* The type of module */
    type: 'base',

    /* Class method for creating a new instance of the view module. Works exactly
     * the same as using new but is useful when chaining commands.
     *
     * Returns an instance of itself.
     */
    create: function (options) {
      var Factory = this;
      return new Factory(options);
    },

    extend: function (proto, methods) {
      return inherit(this, proto, methods);
    }
  });

  /* A factory object that build up a Module object in stages. Handles things like
   * deferring initialization, adding methods and default options.
   *
   * The key benefit of this object is to allow a Module to be built in stages.
   * Only when the build methods is called is the constructor actually created.
   */
  var ModuleFactory = m.create({
    /* Holds an instance of the parent class (if at all). */
    parent: null,

    /* Holds an array of events to be bound to the document. */
    events: null,

    /* An object of default options for the Module. */
    defaults: null,

    /* Module prototype properties. */
    properties: null,

    /* An object holding all module instances. */
    registry: null,

    /* The type of the module */
    type: null,

    /* The data attribute for the module */
    namespace: null,

    /* The CSS selector for finding the module in the page */
    selector: null,

    /* Creates a new instance of the factory.
     *
     * In order for the .extends() method to accept strings this object
     * requires a second argument that takes a module 'type' and returns a
     * constructor.
     *
     * type       - A unique name for the module. Will be used as a data-* attribute.
     * findModule - A lookup function, accepts a string and returns a Module.
     *
     * Returns a new ModuleFactory instance.
     */
    constructor: function ModuleFactory(type, findModule) {
      if (!type) {
        throw new Error('ModuleFactory must be assigned a type');
      }

      this.type = type;
      this.namespace = 'data-' + type;
      this.selector = '[' + this.namespace + ']';
      this.events = [];
      this.defaults = {};
      this.properties = {};
      this.mixin = this.methods;

      // Assign the findModule function if provided.
      if (typeof findModule === 'function') {
        this.findModule = findModule;
      }
    },

    /* Builds the new constructor for the module. This should be called when you
     * have finished adding properties to the Module.
     *
     * options - An options object (default: {})
     *           force: If true will rebuild and cache a new Module instance.
     *
     * Returns a new module constructor object (subclass).
     */
    build: function (options) {
      this.cached = options && options.force ? null : this.cached;
      if (this.cached) {
        return this.cached;
      }

      // Perform a bit of magic to ensure we get nice output in the Webkit
      // inspector. By creating a named constructor function with eval we
      // can get the name output in the console. We have to do this each
      // time an object is created to ensure unique constructors.
      var cloned = _.clone(this.properties);
      var className = m.$.camelCase(this.type) + 'Module';
      className = className.slice(0, 1).toUpperCase() + className.slice(1);

      // TODO: This breaks IE < 9 so we crudely check for the event
      // listener support. We should also only use this line in development.
      if (window.addEventListener) {
        eval('cloned.constructor = function ' + className + '() { ' + className + '.__super__.constructor.apply(this, arguments) }');
      }

      return this.cached = (this.parent || Module).extend(cloned, {type: this.type});
    },

    /* Define the parent constructor to use for the module. This can either be a
     * string type of the module or a constructor object.
     *
     * NOTE: The findModule() method must have been provided for the string
     * lookup to work.
     *
     * object - Type string or constructor object.
     *
     * Examples
     *
     *   module('my-module').extend(TooltipModule);
     *   module('my-module').extend('tooltip');
     *
     * Returns itself.
     */
    extend: function (object) {
      if (typeof object === 'string') {
        object = this.findModule(object);
      }

      if (!(object.prototype instanceof Module)) {
        throw new Error('Expected ' + object + ' to be a Module');
      }

      this.parent = object;
      return this;
    },

    /* Add new methods (and properties) to the module prototype. This is the core
     * of the factory and allows modules to be built in stages.
     *
     * object - An object of properties to add to the module.
     *
     * Examples
     *
     *   module('my-module').methods({
     *     onClick: function (event) {
     *       event.preventDefault()
     *     }
     *   });
     *
     *   // Same as calling:
     *   module('my-module', { ... methods ... });
     *
     * Returns itself.
     */
    methods: function (object) {
      _.each(object, function (value, key) {
        if (this.properties[key]) {
          throw new Error('Overwriting property ' + key + ' in ' + this.type + ' module');
        }
        this.properties[key] = value;
      }, this);

      return this;
    },

    /* Alias for .methods(). Generally use this to indicate you're applying an object
     * of shared properties rather than unique ones to the module.
     *
     * object - An object of properties to add to the module.
     *
     * Examples
     *
     *   // Add generic .show() and .hide() methods.
     *   module('my-module').mixin(mixins.toggle)
     *
     * Returns itself.
     */
    mixin: null, // Set in the constructor.

    /* Define the options that should be extracted from the element's data
     * attributes. Values provided will act as defaults.
     *
     * defaults - An object of key/value options.
     *
     * Examples
     *
     *   module('my-module').options(limit: 5, offset: 10)
     *
     * Returns itself.
     */
    options: function (defaults) {
      _.extend(this.defaults, defaults);
      return this;
    },

    /* Extracts an object of data attributes from the element provided. These
     * will be merged with the this.defaults. The data attributes must be prefixed
     * with this.namespace.
     *
     * element - A dom element to extract data attributes from.
     *
     * Examples
     *
     *   // <div data-load-more data-load-more-limit="5" />
     *   factory.extract(element) //=> {limit: 5}
     *
     * Returns an object of options.
     */
    extract: function (element) {
      var options = {};
      var prefix = this.namespace + '-';

      _.each(element.attributes, function (attr) {
        if (attr.name.indexOf(prefix) === 0) {
          var prop = attr.name.slice(prefix.length);
          var value;

          // Attempt to parse the string as JSON. If this fails then simply use
          // the attribute value as is.
          try {
            // If we have a boolean attribute (no value) then set to true.
            value = attr.value === "" ? true : m.$.parseJSON(attr.value);
          } catch (error) {
            value = attr.value;
          }

          options[m.$.camelCase(prop)] = value;
        }
      });

      return _.extend({}, this.defaults, options);
    },

    /* Defer initialization of this module until an event (such as "click").
     *
     * options - An object of config options.
     *           on: The event to initialize on.
     *           preventDefault: If false does not call event.preventDefault().
     *
     * Examples
     *
     *   factory.defer({on: 'click'})
     *
     * Returns itself.
     */
    defer: function (options) {
      if (typeof options !== 'object' || typeof options.on !== 'string') {
        throw new Error('The defer() method requires the passed object to have an "on" property');
      }
      this.events.push(options);
      return this;
    },

    /* Returns true if the Module initialization should be deferred */
    isDeferred: function () {
      return !!this.events.length;
    },

    /* Returns a string representing the object */
    toString: function () {
      return '[object ModuleFactory(type:' + this.type + ')]';
    }
  });

  /* The core method. This creates a new ModuleFactory and adds it to the
   * registry. This should be used to create new view objects.
   *
   * type    - The type of the module to register.
   * methods - An optional object literal of methods to add to the Module
   *           prototype.
   *
   * Examples
   *
   *   module('load-more', {
   *     initialize: function () {
   *       this.$el.on('click', this._onClick)
   *     _onClick: (event) function () {
   *   })
   *
   *   module('load-more').methods(object).defaults(page: 1)
   *
   * Returns a ModuleFactory instance.
   */
  function module(type, methods) {
    if (module.find(type)) {
      throw new Error('Module ' + type + ' has already been registered');
    }

    return module.registry[type] = new module.ModuleFactory(type, module.find).methods(methods);
  }

  /* Holds all ModuleFactory objects by namespace. */
  module.registry = {};

  /* Holds all instances of all created views on the page. */
  module.instances = {};

  /* Looks up a module in the registry */
  module.find = function (type) {
    return module.registry[type] || null;
  };

  module.create = function (type, element, options) {
    var factory = module.find(type);
    return module.instance(factory, element, options);
  };

  /* Initializes elements on the page immediately. */
  module.initialize = function (element) {
    _.each(module.registry, function (factory) {
      if (factory.isDeferred()) {
        return module.delegate(factory);
      }

      var matches = m.$(factory.selector, element);
      _.each(matches,  function (element) {
        module.instance(factory, element);
      });
    });

    return this;
  };

  /* Sets up module delegation on the document */
  module.delegate = function (factory) {
    if (factory.hasDelegated === true) {
      return;
    }

    var document = m.$(window.document);
    _.each(factory.events, function (options) {
      var handler = _.bind(module.delegate.handler, module.delegate, factory, options);
      document.on(options.on, factory.selector, handler);
    });

    factory.hasDelegated = true;
  };

  /* An event handler called each time a delegated event is triggered */
  module.delegate.handler = function (factory, options, event) {
    // Return early if meta key is held down, as this opens the browser
    // default action in a new tab (in most browsers).
    if (event.metaKey) {
      return;
    }

    if (options.preventDefault !== false) {
      event.preventDefault();
    }

    module.instance(factory, event.currentTarget, {}, event);
  };

  /* Create a single instance of a Module from the ModuleFactory and element
   * provided.
   *
   * factory - The ModuleFactory object used to create this instance
   * element - The element to bind this instance to
   * options - The options object to set/override module options for this instance. Optional.
   * event - The event that triggered initialization. Used when initialization is deferred.
   */
  module.instance = function (factory, element, options, event) {
    event = event || null;
    var instance = module.findInstance(factory, element);
    if (instance) {
      return instance.run(event);
    }

    var sandbox = m.sandbox();

    options = _.extend(factory.extract(element), options);
    options.el = element;
    options.sandbox = sandbox;

    instance = factory.build().create(options);
    instance.on('remove', _.bind(module.removeInstance, null, instance));
    instance.run(event);

    module.addInstance(instance);

    return instance;
  };

  /* Finds an existing instance of a module */
  module.findInstance = function (factory, element) {
    return _.find(module.instances[factory.type], function (instance) {
      return instance.el === element;
    }) || null;
  };

  /* Adds a new instance to the cache */
  module.addInstance = function (instance) {
    var instances = module.instances[instance.type()] || [];
    instances.push(instance);
    module.instances[instance.type()] = instances;
  };

  /* Removes an instance from the cache */
  module.removeInstance = function (instance) {
    var index = module.instances[instance.type()].indexOf(instance);
    module.instances[instance.type()].splice(index, 1);
  };

  /* Debugging tool for finding modules created on a particular element. Will
   * either return an array of all modules on an element or if a type is
   * provided, just that instance.
   *
   * element - The element to lookup.
   * type    - A specific module type to return.
   *
   * Examples
   *
   *   // In the browser console the selected element is $0.
   *   m.module.lookup($0); //=> [ModuleA, ModuleB, ModuleC]
   *
   *   m.module.lookup($0, 'a') //=> ModuleA
   *
   * Returns an array of modules or the one specified by type.
   */
  module.lookup = function (element, type) {
    var matches = _.map(module.instances, function (modules, currentType) {
      return _.find(modules, function (module) {
        return module.el === element && (!type || type === currentType);
      });
    });

    matches = _.flatten(_.compact(matches));

    return type ? (matches[0] || null) : matches;
  };

  /* Extends the Module.prototype. Libraries should use this to add properties
   * to the module instances.
   *
   * properties - An object literal of properties to add to the sandbox.
   *
   * Examples
   *
   *   module.mixin({
   *     doSomething: function (path) { jQuery.ajax(path) }
   *   });
   *
   * Returns itself.
   */
  module.mixin = function (properties) {
    var prototype = Module.prototype;
    _.each(properties, function (value, key) {
      if (prototype[key]) {
        throw new Error('Cannot overwrite existing property ' + key + ' on Module prototype');
      }
      prototype[key] = value;
    }, this);

    return this;
  };

  /* Export to the window */
  m.module = module;
  m.module.Module = Module;
  m.module.ModuleFactory = ModuleFactory;

  // Unbind all event handlers when a module is removed from the document.
  m.events.subscribe('module:remove', function (module) {
    module.sandbox.unsubscribe();
  });

  // Reinitialize the module when a module's HTML is set.
  m.events.subscribe('module:html', function (html, module) {
    m.module.initialize(module.el);
  });

})(this.m = this.m || {}, this.Broadcast, this.inherit, this._);
