import Ember from 'ember';

var get = Ember.get;

/**
 * `PopupMixin` adds popup functionality to any
 * `Layer` class.
 *
 * @class PopupMixin
 * @extends Ember.Mixin
 */
export default Ember.Mixin.create({
  popupContent: '',
  popupViewClass: null,
  popupOptions: {offset: L.point(0, -36)},

  click: function(e) {
    if(this._super) { this._super(e); }
    this.openPopup(e);
  },

  dragstart: function(e) {
    if(this._super) { this._super(e); }
    this.closePopup();
  },

  openPopup: function(e) {
    this.willOpenPopup();
    var latLng;
    if (this._layer.getLatLng) { latLng = this._layer.getLatLng(); }
    else { latLng = L.latLngBounds(this._layer.getLatLngs()).getCenter(); }
    this._popup
      .setLatLng((e && e.latlng) || latLng)
      .openOn(this._layer._map);
    this._createPopupContent();
    this.didOpenPopup();
  },

  closePopup: function() {
    this.willClosePopup();
    this._layer._map.closePopup();
    this.didClosePopup();
  },

  willOpenPopup: Ember.K,
  didOpenPopup: Ember.K,

  willClosePopup: Ember.K,
  didClosePopup: Ember.K,

  willCreatePopup: Ember.K,
  didCreatePopup: Ember.K,

  willDestroyPopup: Ember.K,
  didDestroyPopup: Ember.K,

  _createPopupContent: function() {
    if(!get(this, 'popupViewClass')) {
      this._popup.setContent(get(this, 'popupContent'));
      return;
    }
    if(this._popupView) { this._destroyPopupContent(); }
    var viewClass = get(this, 'popupViewClass');
    if(Ember.typeOf(viewClass) === 'string') {
      viewClass = get(this, 'container').lookupFactory('view:' + viewClass);
    }
    this._popupView = viewClass.create({
      container: get(this, 'container'),
      controller: get(this, 'controller'),
      context: get(this, 'controller'),
      content: get(this, 'content')
    });
    var self = this;
    // You can't call this._popupView.replaceIn because it erroneously detects
    // the view as an Ember View because the popup's parent map's parent view
    // is an Ember View. So we need to trick it by calling the renderer's
    // replace function.
    // In Ember 1.10 we need to access renderer through constructor.
    var renderer = this._popupView.constructor.renderer || this._popupView.renderer;
    renderer.replaceIn(this._popupView, this._popup._contentNode);
    this._popup.update();

    // After the view has rendered, call update to ensure
    // popup is visible with autoPan
    Ember.run.schedule('afterRender', this, function() {
      self._popup.update();
    });
  },

  _destroyPopupContent: function() {
    if(!get(this, 'popupViewClass')) { return; }
    if(this._popupView) {
      this._popupView.destroy();
      this._popupView = null;
    }
  },

  _createPopup: function() {
    this.willCreatePopup();
    this._popup = L.popup(get(this, 'popupOptions'), this._layer);
    var oldOnRemove = this._popup.onRemove, self = this;
    this._popup.onRemove = function(map) {
      self._destroyPopupContent();
      oldOnRemove.call(self._popup, map);
    };
    this.didCreatePopup();
  },

  _destroyPopup: function() {
    if(!this._popup) { return; }
    this.willDestroyPopup();
    // closing popup will call _destroyPopupContent
    if(this._popup._map && this._layer && this._layer._map) {
      this._layer._map.closePopup(); }
    this._popup = null;
    this.didDestroyPopup();
  },

  _updatePopup: Ember.observer('popupContent', function() {
    if(!this._popup) { return; }
    this._popup.setContent(get(this, 'popupContent'));
  }),

  _removePopupObservers: Ember.beforeObserver(function() {
    if(!this._layer) { return; }
    this._destroyPopup();
  }, 'layer'),

  _addPopupObservers: Ember.observer('layer', function() {
    if(!this._layer) { return; }
    this._createPopup();
  })
});
