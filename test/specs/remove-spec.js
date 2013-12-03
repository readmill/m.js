describe('jQuery.event.special.remove', function () {

  if (!m.$.event || !m.$.event.special) {
    return it('The current DOM library does not support the jQuery.event.special API');
  }

  beforeEach(function () {
    this.let('$element', function () {
      return jQuery('<div>');
    });

    this.let('$child', function () {
      return jQuery('<div>');
    });

    this.$element.append(this.$child);
  });

  it('calls the event handler on remove', function () {
    var target = sinon.spy();
    this.$element.on('remove', target);
    this.$element.remove();
    assert.called(target);
  });

  it('calls the children event handlers on remove', function () {
    var target = sinon.spy();
    this.$child.on('remove', target);
    this.$element.remove();
    assert.called(target);
  });

  it('calls the event handler when element replaced', function () {
    var target = sinon.spy();
    this.$child.on('remove', target);
    this.$element.html('');
    assert.called(target);
  });

});
