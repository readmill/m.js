Contents
--------

- [Intro](#intro)
- [Setup](#setup)
- [Modules](#modules)
- [Sandboxes](#sandboxes)
  - [Extending the Sandbox](#extending-the-sandbox)
- [Working with Modules](#working-with-modules)
  - [Passing Options to Modules](#passing-options-to-modules)
  - [Events](#events)
  - [Deferred initialization](#deferred-initialization)
  - [Mixins](#mixins)
  - [Event Clean Up](#event-clean-up)
- [Debugging](#debugging)
- [Testing](#testing)

Intro
-----

A light framework designed to solve three common problems when writing JavaScript for web pages.

1. Initialization: Only executing JavaScript code when the relevant HTML is available on the page.
2. Isolation: Portions of code, especially event handlers, updating elements all over a given page.
3. Testability: Passing dependancies into the code to make it easy to stub when testing.

Setup
-----

All **m** requires to function is the *m.js* script included on the page after the [jQuery](http://jquery.com) and [Underscore](http://underscorejs.org) libraries. Then modules should be defined. Finally, the `m.module.initialize()` method should be called once everything is loaded, it might look something like this:

```html
<script src="vendor/jquery.js"></script>
<script src="vendor/underscore.js"></script>
<script src="vendor/m.js"></script>
<script src="modules/like-button.js"></script>
<script src="modules/comment-box.js"></script>
<script>
  // Initialize modules in the document.body element.
  m.module.initialize(document.body);
</script>
```

Modules
-------

The core part of **m** is creating modules. These can be thought of as distinct portions of a web page that are ideally responsible for one thing. Think a like button, a comment box, a popup menu etc.

A module can be defined using `m.module()`:

```js
m.module('like-button', {
  initialize: function () {
    this.el; // <div data-like-button />
  }
});
```

When an element with a `data-like-button` attribute is found on a page. An instance of the `like-button` module will be created and the element set to the `this.el` property (a jQuery wrapped `this.$el` is also available). The `initialize()` method is then called allowing you to set up the element with event listeners and other logic.

The API for a module is very similar to a [Backbone.View][#backbone] as it supports a subset of the methods such as `.el`, `.$el`, `.$()` and `.events`.

There are three guidelines to keep in mind when creating modules:

1. A module should primarily do one thing.
2. A module should not interact directly with any element outside of it's children.
3. A module should not interact directly with any other modules.

[#backbone]: http://backbonejs.org/#View

Sandboxes
---------

Each module is also given it's own sandbox, this is how it interacts with the rest of the page. By default the sandbox only has an event hub with `.publish()` and `.subscribe()` methods but it's also possible to add additional methods via the `m.sandbox.mixin()` API.

The idea is to keep all dependancies separate from the module and the global namespace by accessing them through the sandbox. This way a mock sandbox can be passed into a module for testing.

```js
// One module can trigger events that others react to.
m.module('like-button', {
  events: {click: '_onClick'}, // DOM events can be bound here.
  _onClick: function () {
    this.sandbox.publish('like');
  }
});

// A counter can update.
m.module('like-counter', {
  initialise: function () {
    this.sandbox.subscribe('like', this._onLike, this);
  },
  ...
  _onLike: function () {
    this.el.innerHTML = this.el.innerHTML + 1;
  }
});

// External library code can also listen to these events.
m.events.subscribe('like', function () {
  jQuery.post('/like');
});
```

__NOTE:__ A sandbox can also be created for testing by calling `m.sandbox()`.

### Extending the Sandbox

The sandbox should be extended to include site specific methods and helpers. Use this to do all your global DOM manipulation. A client for making http requests is also a good example:

```js
// Used to add methods to the Sandbox prototype. Don't add
// objects here they will be shared across all instances :)
m.sandbox.mixin({
  template: function (name) {
    return jQuery('[data-template-' + name + ']').html();
  },
  createElement: function (html) {
    return jQuery(html);
  }
});

// Called when a sandbox is created, receives the sandbox
// instance. Use this to add objects to the sandbox.
m.sandbox.setup(function (instance) {
  instance.client = new WebClient();
});
```

Check out *sandbox.js* for code, documentation and examples.
Working with Modules
--------------------

While modules are pretty basic in themselves, there are a few extra methods that extend them.

### Passing in options to modules

Data attributes can be added to elements following the style `#{module_name}-#{option_key}=#{option_value}`. These will be extracted from the element and set on the `this.options` property. Defaults can be provided by using the `.options()` method.

Hyphenated names will be converted to camelCase and JSON inside values will be evaluated allowing complex data structures to be passed in.

```html
<!-- html -->
<div data-truncate data-truncate-lines="5">...</div>
```

```js
// JavaScript
m.module('truncate', {
  initialize: function () {
    this.options.likes === 5;
  }
}).options({likes: 2});
```

See `ModuleFactory#extract()` in *module.js* for more documentation and examples.

### Events

DOM events such as click and key press handlers can easily be added by using the `.events` property. These follow the style `#{event} #{selector}: #{method}`. If no selector is provided the root module element (`this.el`) will be used.

```js
m.module('comment-field', {
  events: {
    'keypress textarea': '_onKeypress',
    'blur textarea': '_onBlur'
  },
  _onKeypress: function () {
    // `this` is scoped to the module.
  },
  _onBlur: function () {
  }
});
```

See `Module#delegateEvents()` in *module.js* for more documentation and examples.

### Deferred initialization

Sometimes an element doesn't need to do anything on a page until the user interacts with it. In these cases it's wasteful to use the `.initialize()` method to set the whole object up on page load.

The `.defer()` method can be used to wait until a DOM event is triggered before running the `.initialize()` code. A separate method `.run()` will be called each time the event is subsequently triggered.

```js
m.module('alert-button', {
  initialize: function () {
    // Put any expensive setup in here. It will be run once.
  },
  run: function (event) {
    // This will be run once per click. The event object is
    // the click event. prevetntDefault is called by default.
    alert('clicked');
  }
}).defer({on: 'click'});
```

See `ModuleFactory#defer()` in *module.js* for more documentation and examples.

### Mixins

If you find you have modules sharing a lot of the same code, you can use the `.mixin()` method to share it between modules.

```js
var toggle = {
  show: function () { this.$el.show(); },
  hide: function () { this.$el.hide(); },
  isVisible: function () { this.$el.is(':visible'); }
};

m.module('faq-entry', {
  events: {'click button': '_onToggle'},
  _onToggle: function () {
    this.isVisible() ? this.hide() : this.show();
  }
}).mixin(toggle);
```

### Event clean up

A module can be removed from the page at any time by calling the `.remove()` method. **m** manages DOM event handlers and sandbox subscriptions for you so you don't need to unbind these yourself. But should anything else need to be cleaned up this should be done in the `.teardown()` method.

```js
m.module('timer', {
  initialize: function () {
    this.timer = setInterval(this.runLots, 300);
  },
  teardown: function () {
    clearTimeout(this.timer);
  }
});
```

Debugging
---------

Sometimes it's often desirable to interact with a module when it's loaded on the page for debugging. The `m.module.lookup()` function will take an element and return all modules associated with it.

```js
// In the browser console the selected element === $0.
var modules = m.module.lookup($0); // [Module1, Module2]
var module  = m.module.lookup($0, 'toggle') // ToggleModule
module.show();
module.isVisible();
```

Testing
-------

To create an instance of a module for testing the following pattern can be used:

```js
// Find the module factory used to create instances.
var factory = m.module.find('like-button');

// Create an instance, the `force` flag ignores the cache.
var LikeButtonModule = factory.build({ force: true });

var instance = new LikeButtonModule({
  el: fixtureElement,
  sandbox: fixtureSandbox,
  option1: 'an option',
  option2: 'another option'
});
```
