(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

//#region src/js/switch.js
/**
	* Switch Class
	* @class
	*/
	var Switch = class extends _fr0st_ui.BaseComponent {
		/**
		* New Switch constructor.
		* @param {HTMLElement} node The input node.
		* @param {object} [options] The options to create the Switch with.
		*/
		constructor(node, options) {
			super(node, options);
			const id = _fr0st_query.default.getAttribute(this._node, "id");
			this._label = _fr0st_query.default.findOne(`label[for="${id}"]`);
			if (this._label && !_fr0st_query.default.getAttribute(this._label, "id")) {
				_fr0st_query.default.setAttribute(this._label, { id: (0, _fr0st_ui.generateId)("switch-label") });
				this._labelId = true;
			}
			this._render();
			this._refresh();
			this._refreshDisabled();
			this._events();
			this._currentX = -this._toggleWidth;
			const checked = _fr0st_query.default.getProperty(this._node, "checked");
			this._animateState(checked);
		}
		/**
		* Disable the Switch.
		*/
		disable() {
			_fr0st_query.default.setAttribute(this._node, { disabled: true });
			this._refreshDisabled();
		}
		/**
		* Dispose the Switch.
		*/
		dispose() {
			if (this._labelId) _fr0st_query.default.removeAttribute(this._label, "id");
			_fr0st_query.default.remove(this._outerContainer);
			_fr0st_query.default.removeEvent(this._node, "focus.ui.switch");
			_fr0st_query.default.removeEvent(this._node, "change.ui.switch");
			_fr0st_query.default.removeAttribute(this._node, "tabindex");
			_fr0st_query.default.removeClass(this._node, this.constructor.classes.hide);
			this._label = null;
			this._outerContainer = null;
			this._container = null;
			this._onToggle = null;
			this._divider = null;
			this._offToggle = null;
			super.dispose();
		}
		/**
		* Enable the Switch.
		*/
		enable() {
			_fr0st_query.default.removeAttribute(this._node, "disabled");
			this._refreshDisabled();
		}
		/**
		* Get the switch checkbox state.
		* @return {Boolean} Whether the switch checkbox is enabled.
		*/
		getState() {
			return _fr0st_query.default.getProperty(this._node, "checked");
		}
		/**
		* Set the switch checkbox state.
		* @param {Boolean} checked Whether to enable the switch checkbox.
		*/
		setState(checked) {
			this._animateState(checked);
		}
		/**
		* Toggle switch checkbox state.
		*/
		toggleState() {
			const checked = this.getState();
			this._animateState(!checked);
		}
	};

//#endregion
//#region src/js/prototype/events.js
/**
	* Attach events for the Switch.
	*/
	function _events() {
		_fr0st_query.default.addEvent(this._node, "focus.ui.switch", (_) => {
			_fr0st_query.default.focus(this._outerContainer);
		});
		_fr0st_query.default.addEvent(this._node, "change.ui.switch", (e) => {
			if (e.skipUpdate || _fr0st_query.default.getDataset(this._container, "uiAnimating") || _fr0st_query.default.getDataset(this._container, "uiSliding")) return;
			const checked = this.getState();
			this._animateState(checked);
		});
		_fr0st_query.default.addEvent(this._outerContainer, "keyup.ui.switch", (e) => {
			if (e.code !== "Space" || _fr0st_query.default.getDataset(this._container, "uiAnimating") || _fr0st_query.default.getDataset(this._container, "uiSliding")) return;
			this.toggleState();
		});
		_fr0st_query.default.addEvent(this._outerContainer, "click.ui.switch", (e) => {
			if (e.button || _fr0st_query.default.getDataset(this._container, "uiAnimating") || _fr0st_query.default.getDataset(this._container, "uiSliding")) return;
			this.toggleState();
		});
		let startX;
		const downEvent = (e) => {
			if (e.button || _fr0st_query.default.getDataset(this._container, "uiAnimating") || _fr0st_query.default.getDataset(this._container, "uiSliding")) return false;
			startX = (0, _fr0st_ui.getPosition)(e).x - this._currentX;
		};
		const moveEvent = (e) => {
			if (!_fr0st_query.default.getDataset(this._container, "uiSliding")) _fr0st_query.default.setDataset(this._container, { uiSliding: true });
			const currentX = (0, _fr0st_ui.getPosition)(e).x;
			this._currentX = _fr0st_query.default._clamp(currentX - startX, -this._toggleWidth, 0);
			_fr0st_query.default.setStyle(this._container, { transform: `translateX(${this._currentX}px)` });
		};
		const upEvent = (_) => {
			if (!_fr0st_query.default.getDataset(this._container, "uiSliding")) return;
			const checked = Math.abs(this._currentX) < this._toggleWidth / 2;
			setTimeout((_) => {
				_fr0st_query.default.removeDataset(this._container, "uiSliding");
				this._animateState(checked);
			}, 0);
		};
		const dragEvent = _fr0st_query.default.mouseDragFactory(downEvent, moveEvent, upEvent, { preventDefault: false });
		_fr0st_query.default.addEvent(this._outerContainer, "mousedown.ui.switch touchstart.ui.switch", dragEvent);
	}

//#endregion
//#region src/js/prototype/helpers.js
/**
	* Animate the switch checkbox state.
	* @param {Boolean} checked Whether to enable the switch checkbox.
	*/
	function _animateState(checked) {
		if (_fr0st_query.default.getDataset(this._container, "uiSliding")) return;
		if (_fr0st_query.default.getDataset(this._container, "uiAnimating")) _fr0st_query.default.stop(this._container, { finish: false });
		let targetX;
		let progress;
		if (checked) {
			targetX = 0;
			progress = (this._toggleWidth - Math.abs(this._currentX)) / this._toggleWidth;
		} else {
			targetX = -this._toggleWidth;
			progress = Math.abs(this._currentX) / this._toggleWidth;
		}
		if (!this._options.animate || progress >= 1) {
			_fr0st_query.default.setStyle(this._container, { transform: `translateX(${targetX}px)` });
			this._currentX = targetX;
			this._setState(checked);
			_fr0st_query.default.removeDataset(this._container, "uiAnimating");
			return;
		}
		const progressRemaining = 1 - progress;
		_fr0st_query.default.setDataset(this._container, { uiAnimating: true });
		_fr0st_query.default.animate(this._container, (node, newProgress) => {
			this._currentX = _fr0st_query.default._lerp(this._currentX, targetX, progress + newProgress * progressRemaining);
			_fr0st_query.default.setStyle(node, { transform: `translateX(${this._currentX}px)` });
		}, { duration: this._options.duration * progressRemaining }).then((_) => {
			_fr0st_query.default.removeDataset(this._container, "uiAnimating");
			this._currentX = targetX;
			this._setState(checked);
		}).catch((_) => {
			_fr0st_query.default.removeDataset(this._container, "uiAnimating");
		});
	}
	/**
	* Refresh the label/divider widths.
	*/
	function _refresh() {
		if (this._options.labelWidth) this._toggleWidth = this._options.labelWidth;
		else this._toggleWidth = Math.max(_fr0st_query.default.width(this._onToggle), _fr0st_query.default.width(this._offToggle));
		if (this._options.dividerWidth) this._dividerWidth = this._options.dividerWidth;
		else this._dividerWidth = this._toggleWidth / 2;
		const outerWidth = this._toggleWidth + this._dividerWidth;
		const totalWidth = this._toggleWidth * 2 + this._dividerWidth;
		_fr0st_query.default.setStyle(this._outerContainer, { width: `${outerWidth}px` });
		_fr0st_query.default.setStyle(this._container, {
			width: `${totalWidth}px`,
			transform: `translateX(${-this._toggleWidth}px)`
		});
		_fr0st_query.default.setStyle(this._onToggle, { width: `${this._toggleWidth}px` });
		_fr0st_query.default.setStyle(this._divider, { width: `${this._dividerWidth}px` });
		_fr0st_query.default.setStyle(this._offToggle, { width: `${this._toggleWidth}px` });
	}
	/**
	* Refresh the disabled styling.
	*/
	function _refreshDisabled() {
		const disabled = _fr0st_query.default.is(this._node, ":disabled");
		if (disabled) _fr0st_query.default.addClass(this._outerContainer, this.constructor.classes.disabled);
		else _fr0st_query.default.removeClass(this._outerContainer, this.constructor.classes.disabled);
		_fr0st_query.default.setAttribute(this._outerContainer, {
			"aria-disabled": disabled,
			"tabindex": disabled ? -1 : 0
		});
	}
	/**
	* Set the switch checkbox state.
	* @param {Boolean} checked Whether to enable the switch checkbox.
	*/
	function _setState(checked) {
		_fr0st_query.default.setAttribute(this._outerContainer, { "aria-checked": checked });
		if (this.getState() === checked) return;
		_fr0st_query.default.setProperty(this._node, { checked });
		_fr0st_query.default.triggerEvent(this._node, "change.ui.switch", { data: { skipUpdate: true } });
	}

//#endregion
//#region src/js/prototype/render.js
/**
	* Render the switch.
	*/
	function _render() {
		this._outerContainer = _fr0st_query.default.create("div", {
			class: [this.constructor.classes.outer, `switch-${this._options.size}`],
			attributes: {
				"role": "switch",
				"aria-checked": this.getState(),
				"aria-required": _fr0st_query.default.getProperty(this._node, "required")
			}
		});
		if (this._label) {
			const labelId = _fr0st_query.default.getAttribute(this._label, "id");
			_fr0st_query.default.setAttribute(this._outerContainer, { "aria-labelledby": labelId });
		}
		this._container = _fr0st_query.default.create("div", {
			class: this.constructor.classes.switch,
			attributes: { "aria-hidden": true }
		});
		this._onToggle = _fr0st_query.default.create("div", {
			class: [this.constructor.classes.toggleOn, this._options.onStyle],
			text: this._options.onText
		});
		this._divider = _fr0st_query.default.create("div", {
			class: [this.constructor.classes.toggleDivider, this._options.dividerStyle],
			text: ""
		});
		this._offToggle = _fr0st_query.default.create("div", {
			class: [this.constructor.classes.toggleOff, this._options.offStyle],
			text: this._options.offText
		});
		_fr0st_query.default.append(this._container, this._onToggle);
		_fr0st_query.default.append(this._container, this._divider);
		_fr0st_query.default.append(this._container, this._offToggle);
		_fr0st_query.default.append(this._outerContainer, this._container);
		_fr0st_query.default.addClass(this._node, this.constructor.classes.hide);
		_fr0st_query.default.setAttribute(this._node, { tabindex: -1 });
		_fr0st_query.default.before(this._node, this._outerContainer);
	}

//#endregion
//#region src/js/index.js
	Switch.defaults = {
		size: "md",
		onStyle: "text-bg-primary",
		offStyle: "text-bg-secondary",
		dividerStyle: "bg-body-tertiary",
		onText: "ON",
		offText: "OFF",
		labelWidth: null,
		dividerWidth: null,
		animate: true,
		duration: 500
	};
	Switch.classes = {
		disabled: "switch-disabled",
		hide: "visually-hidden",
		outer: "switch-outer",
		switch: "switch",
		toggleDivider: "switch-toggle-divider",
		toggleOff: "switch-toggle-off",
		toggleOn: "switch-toggle-on"
	};
	var proto = Switch.prototype;
	proto._animateState = _animateState;
	proto._events = _events;
	proto._refresh = _refresh;
	proto._refreshDisabled = _refreshDisabled;
	proto._render = _render;
	proto._setState = _setState;
	(0, _fr0st_ui.initComponent)("switch", Switch);
	var js_default = Switch;

//#endregion
exports.Switch = js_default;
});
//# sourceMappingURL=frost-ui-switch.js.map