/*  Soak.js - v0.3.0
 *  Copyright 2011, Aron Carroll
 *  Released under the MIT license
 *  More Information: http://github.com/aron/soak.js
 */
(function (exports) {

  var _inherit = exports.inherit,
      _create  = exports.create,
      _mixin   = exports.mixin;

  /* Helper function to create .noConflict() methods for each function.
   *
   * name     - Name of the property on the exports object.
   * original - The original value of the property.
   * local    - The local function.
   *
   * Examples
   *
   *   create.noConflict = createNoConflict('create', _create, create);
   *
   * Returns a .noConflict() function.
   */
  function createNoConflict(name, original, local) {
    return function () {
      exports[name] = original;
      return local;
    };
  }

  /* Public: Extends an object with the properties of successive arguments.
   *
   * target     - The Object that is to be extended.
   * arguments* - Objects to extend the target with.
   *
   * Examples
   *
   *   mixin({type: 'person'}, {name: 'bill', age: 20}, {age: 21});
   *   //=> {type: 'person', name: 'bill', age: 21}
   *
   * Returns the extended object.
   */
  function mixin() {
    var target  = arguments[0],
        objects = Array.prototype.slice.call(arguments, 1),
        count = objects.length,
        index = 0, object, property;

    for (; index < count; index += 1) {
      object = objects[index];
      for (property in object) {
        if (object.hasOwnProperty(property)) {
          target[property] = object[property];
        }
      }
    }

    return target;
  }

  /* Removes the mixin function from the exports object and returns it. */
  mixin.noConflict = createNoConflict('mixin', _mixin, mixin);

  /* Used to create a new object in case calling the parent has side effects */
  function DummyObject() {}

  /* Public: Creates a new object that inherits from the proto argument.
   *
   * This function will use Object.create() if it exists otherwise falls back
   * to using a dummy constructor function to create a new object instance.
   * Unlike Object.create() this function will always return a new object even
   * if a non object is provided as an argument.
   *
   * proto - An object to use for the new objects internal prototype.
   *
   * Examples
   *
   *   var appleObject = {color: 'green'}
   *   var appleInstance = create(appleObject);
   *
   *   appleInstance.hasOwnProperty('color'); //=> false
   *   appleInstance.color === appleObject.color; //=> true
   *
   * Returns a newly created object.
   */
  function create(proto) {
    if (typeof proto !== 'object') {
      return {};
    }
    else if (Object.create) {
      return Object.create(proto);
    }
    DummyObject.prototype = proto;
    return new DummyObject();
  }

  /* Removes the create function from the exports object and returns it. */
  create.noConflict = createNoConflict('create', _create, create);

  /* Public: Creates a new constructor function that inherits from a parent.
   * Instance and static methods can also be provided as additional arguments.
   * if the methods argument has a property called "constructor" this will be
   * used as the constructor function.
   *
   * Static methods will also be copied over from the parent object. However
   * these will not be inheritied prototypally as with the instance methods.
   *
   * parent     - A constructor Function to inherit from.
   * methods    - An Object literal of instance methods that are added to the
   *              constructors prototype.
   * properties - An Object literal of static/class methods to add to the
   *              constructor itself.
   *
   * Examples
   *
   *   function MyObject() {};
   *
   *   var SubClass = inherit(MyObject, {method: function () {}});
   *   var instance = new SubClass();
   *
   *   instance instanceof MyObject //=> true
   *
   * Returns the new constructor Function.
   */
  function inherit(parent, methods, properties) {
    methods = methods || {};

    var Child = methods.hasOwnProperty('constructor') ?
                methods.constructor : inherit.constructor(parent);

    Child.prototype = create(parent.prototype);
    Child.prototype.constructor = Child;

    mixin(Child.prototype, methods);

    return mixin(Child, parent, properties, {__super__: parent.prototype});
  }

  /* Public: A factory method that creates a default constructor function
   * that simply calls the parent constructor of the current instance. This
   * method can be overridden to provide your own default constructor.
   *
   * This Base constructor has an .extend() method that will create a subclass
   * of the Base object. Which is the same as doing inherit(Base);
   *
   * parent - The parent constructor Function.
   *
   * Example:
   *
   * var Base  = inherit.constructor(Object);
   * var Child = Base.extend();
   *
   * Returns a Function to be used as a constructor.
   */
  inherit.constructor = function (parent) {
    function Base() {
      parent.apply(this, arguments);
    }

    Base.extend = function extend() {
      return inherit.apply(null, [].concat.apply([this], arguments));
    };

    return Base;
  };

  /* Removes the inherit function from the exports object and returns it. */
  inherit.noConflict = createNoConflict('inherit', _inherit, inherit);

  // Export module to environment.
  if (typeof exports.define === 'function' && exports.amd) {
    exports.define('soak', {mixin: mixin, inherit: inherit, create: create});
  } else {
    mixin(exports, {mixin: mixin, inherit: inherit, create: create});
  }

})(typeof exports !== 'undefined' ? exports : this);
