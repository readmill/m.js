/* jQuery special event whose handler is called only when the element
 * is removed from DOM. Useful for tearing down a module on DOM removal.
 *
 * Inspired by http://blog.alexmaccaw.com/jswebapps-memory-management
 *
 * Example
 *   var element = document.createElement('div');
 *   jQuery(element).on('remove', tearDown);
 *   element.remove(); // tearDown function gets called.
 */
(function (m) {
  var $ = m.$;
  if ($.event && $.event.special) {
    $.event.special.remove = {
      remove: function (event) {
        if (event.handler) { event.handler(); }
      }
    };
  }
})(this.m);
