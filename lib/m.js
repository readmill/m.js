(function (exports) {
  var _m = exports.m;

  exports.m = {};
  exports.m.noConflict = function () {
    var m = exports.m;
    exports.m = _m;
    return m;
  };
})(this);
