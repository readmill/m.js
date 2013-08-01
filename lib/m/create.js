(function (m, Backbone) {

  // Use a dummy object to apply the Backbone inheritance method.
  var base = {};
  base.extend = Backbone.View.extend;

  /* Creates a new constructor object with a similar API to the other Backbone
   * objects. New sub objects can be created using the .extend() method. The
   * only requirement is that the first object passed has a constructor
   * property.
   *
   * instance   - Instance methods to be applied to the constructor prototype.
   * properties - Properties to be applied directly to the constructor.
   *
   * Examples
   *
   *   var Adder = create({
   *     // Naming the constructor improves debugger output.
   *     constructor: function Adder(start) {
   *       this.count = start;
   *     },
   *
   *     // An instance method.
   *     add: function (number) { return this.count + number; }
   *   }, {
   *     // A method on Adder.
   *     plusTwo: function () {}
   *   });
   *
   * Returns a new constructor function with prototype and properties.
   */
  m.create = function create(instance, properties) {
    if (!instance || !instance.hasOwnProperty('constructor') || typeof instance.constructor !== 'function') {
      throw new Error('The instance methods argument must have a constructor property');
    }
    return base.extend(instance, properties);
  };

})(this.m = this.m || {}, this.Backbone);
