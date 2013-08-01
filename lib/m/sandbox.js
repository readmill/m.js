/* A sandbox object that can be used to create a unique object for each module
 * on the page. This can easily be extended using sandbox.extend() for adding
 * simple properties and methods or sandbox.setup() for adding objects that
 * cannot simply be added to a prototype.
 */
(function (m, _) {
  var Sandbox = m.create({
    /* Creates a new sandbox. Accepts an array of callbacks that will be invoked
     * and passed the sandbox instance. This is useful for allowing libraries to
     * modify each sandbox instance.
     *
     * callbacks - An array of functions.
     *
     * Returns a new Sandbox instance.
     */
    constructor: function Sandbox(callbacks) {
      _.each(callbacks, function (callback) {
        callback(this);
      }, this);
    }
  });

  /* The primary sandbox method. Should be used by the application to create a
   * new instance of a Sandbox.
   *
   * Examples
   *
   *   var sandbox = new Sandbox();
   *
   * Returns a Sandbox instance.
   */
  function sandbox() {
    return new sandbox.Sandbox(sandbox.callbacks);
  }

  /* Export the constructor */
  sandbox.Sandbox = Sandbox;

  /* Hold all library callbacks. These are passed into the Sandbox constructor
   * by sandbox() and allow instances to be modified.
   */
  sandbox.callbacks = [];

  /* Extends the Sandbox.prototype. Libraries should use this to add immutable
   * properties to the sandbox instances. Objects should be added by setup()
   * to avoid sharing the same object across all instances.
   *
   * properties - An object literal of properties to add to the sandbox.
   *
   * Examples
   *
   *   sandbox.mixin({
   *     getTemplate: function (path) { jQuery.ajax(path) }
   *   });
   *
   * Returns itself.
   */
  sandbox.mixin = function (properties) {
    var prototype = Sandbox.prototype;
    _.each(properties, function (value, key) {
      if (prototype[key]) {
        throw new Error('Cannot overwrite existing property ' + key + ' on Sandbox prototype');
      }
      prototype[key] = value;
    }, this);

    return this;
  };

  /* Registers a callback that will be called when a new sandbox instance is
   * created. This can then be used to add additional properties to the
   * sandbox. Usually new instances of objects.
   *
   * callback - A function that receives a sandbox instance.
   *
   * Examples
   *
   *   sandbox.setup(function (instance) {
   *     instance.client = new APIClient();
   *   });
   *
   * Returns itself.
   */
  sandbox.setup = function (fn) {
    var callbacks = sandbox.callbacks;
    if (typeof fn === 'function') {
      callbacks.push(fn);
    } else {
      throw new Error('sandbox.setup() must be passed a function');
    }
    return this;
  };

  m.sandbox = sandbox;
})(this.m = this.m || {}, this._);
