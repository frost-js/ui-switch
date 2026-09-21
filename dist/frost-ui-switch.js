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
	* @typedef {object} SwitchOptions
	* @property {boolean} [animate=true] Whether to transition state changes.
	* @property {string} [dividerStyle='bg-body-tertiary'] The class applied to the divider.
	* @property {number|null} [dividerWidth=null] The divider width in pixels, or `null` to derive it from the label width.
	* @property {number} [duration=500] The full CSS transition duration in milliseconds.
	* @property {number|null} [labelWidth=null] The label width in pixels, or `null` to measure the labels.
	* @property {string} [offStyle='text-bg-secondary'] The class applied to the off label.
	* @property {string} [offText='OFF'] The off label text.
	* @property {string} [onStyle='text-bg-primary'] The class applied to the on label.
	* @property {string} [onText='ON'] The on label text.
	* @property {string} [size='md'] The switch size suffix.
	*/
	/**
	* Controls a checkbox using a sliding switch interface.
	* @augments {BaseComponent<SwitchOptions>}
	*/
	var Switch = class Switch extends _fr0st_ui.BaseComponent {
		static #DRAG_THRESHOLD = 3;
		#animating = false;
		#animationId = 0;
		#container;
		#currentX = 0;
		#divider;
		#dividerWidth = 0;
		#dragActive = false;
		#dragOffsetX = 0;
		#dragStartX = 0;
		#form;
		#generatedLabelIds = /* @__PURE__ */ new Map();
		#hidden;
		#offToggle;
		#onToggle;
		#outerContainer;
		#pendingResets = /* @__PURE__ */ new Map();
		#resetHandler;
		#rtl = false;
		#sliding = false;
		#suppressClick = false;
		#suppressClickTimer = null;
		#tabIndex;
		#targetState;
		#toggleWidth = 0;
		#window;
		/**
		* Creates a Switch.
		* @param {HTMLInputElement} node The checkbox input node.
		* @param {SwitchOptions} [options] The Switch options.
		*/
		constructor(node, options) {
			super(node, options);
			this.#window = this.node.ownerDocument.defaultView;
			this.#form = this.node.form;
			this.#targetState = this.getState();
			this.#render();
			this.#refresh();
			this.#refreshDisabled();
			this.#events();
		}
		/**
		* Disables the Switch.
		*/
		disable() {
			_fr0st_query.default.setAttribute(this.node, { disabled: true });
			this.#refreshDisabled();
		}
		/** @inheritdoc */
		dispose() {
			this.#cancelAnimation();
			this.#clearClickSuppression();
			this.#pendingResets.clear();
			for (const [label, id] of this.#generatedLabelIds) if (_fr0st_query.default.getAttribute(label, "id") === id) _fr0st_query.default.removeAttribute(label, "id");
			_fr0st_query.default.remove(this.#outerContainer);
			_fr0st_query.default.removeEvent(this.node, "focus.ui.switch");
			_fr0st_query.default.removeEvent(this.node, "change.ui.switch");
			if (this.#form) _fr0st_query.default.removeEvent(this.#form, "reset.ui.switch", this.#resetHandler);
			if (this.#hidden) _fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			else _fr0st_query.default.removeClass(this.node, this.constructor.classes.hide);
			if (this.#tabIndex === null) _fr0st_query.default.removeAttribute(this.node, "tabindex");
			else _fr0st_query.default.setAttribute(this.node, { tabindex: this.#tabIndex });
			this.#container = null;
			this.#divider = null;
			this.#form = null;
			this.#generatedLabelIds = null;
			this.#offToggle = null;
			this.#onToggle = null;
			this.#outerContainer = null;
			this.#resetHandler = null;
			this.#window = null;
			super.dispose();
		}
		/**
		* Enables the Switch.
		*/
		enable() {
			_fr0st_query.default.removeAttribute(this.node, "disabled");
			this.#refreshDisabled();
		}
		/**
		* Gets the checkbox state.
		* @returns {boolean} Whether the checkbox is checked.
		*/
		getState() {
			return Boolean(_fr0st_query.default.getProperty(this.node, "checked"));
		}
		/**
		* Sets the checkbox state.
		* @param {boolean} checked Whether the checkbox is checked.
		*/
		setState(checked) {
			this.#animateState(checked);
		}
		/**
		* Toggles the checkbox state.
		*/
		toggleState() {
			this.#animateState(!this.#targetState);
		}
		/**
		* Transitions the Switch to a normalized checkbox state.
		* @param {boolean} checked The checkbox state to normalize.
		*/
		#animateState(checked) {
			if (this.#sliding) return;
			checked = Boolean(checked);
			this.#cancelAnimation();
			this.#targetState = checked;
			const animationId = this.#animationId;
			const targetX = this.#getTargetX(checked);
			const distance = Math.abs(targetX - this.#currentX);
			const duration = Number(this.options.duration);
			if (!this.options.animate || this.#toggleWidth <= 0 || !Number.isFinite(duration) || duration <= 0 || distance <= 0) {
				this.#setPosition(targetX);
				this.#setState(checked);
				return;
			}
			const durationScale = Math.min(distance / this.#toggleWidth, 1);
			this.#animating = true;
			_fr0st_query.default.setStyle(this.#outerContainer, {
				"--ui-switch-transition-duration": `${duration}ms`,
				"--ui-switch-transition-scale": durationScale
			});
			_fr0st_query.default.css(this.#container, "transform");
			_fr0st_query.default.setStyle(this.#container, { transform: `translateX(${targetX}px)` });
			(0, _fr0st_ui.waitForTransition)(this.#container, ["transform"]).then((_) => {
				if (animationId !== this.#animationId || !this.node || [...this.#pendingResets].some(([event, resetAnimationId]) => resetAnimationId === animationId && !event.defaultPrevented)) return;
				this.#animating = false;
				this.#currentX = targetX;
				_fr0st_query.default.setStyle(this.#outerContainer, { "--ui-switch-transition-scale": "" });
				this.#setState(checked);
			});
		}
		/**
		* Cancels the active transition at its rendered position.
		*/
		#cancelAnimation() {
			this.#animationId++;
			if (!this.#animating || !this.#container) return;
			const currentX = this.#getRenderedX();
			this.#animating = false;
			this.#setPosition(currentX);
			_fr0st_query.default.setStyle(this.#outerContainer, { "--ui-switch-transition-scale": "" });
		}
		/**
		* Clears pending click suppression after a drag.
		*/
		#clearClickSuppression() {
			if (this.#suppressClickTimer !== null) {
				this.#window?.clearTimeout(this.#suppressClickTimer);
				this.#suppressClickTimer = null;
			}
			this.#suppressClick = false;
		}
		/**
		* Completes a pointer drag and transitions to the nearest state.
		*/
		#endDrag() {
			const dragActive = this.#dragActive;
			this.#dragActive = false;
			if (!this.node) return;
			if (!dragActive) {
				this.#suppressNextClick();
				return;
			}
			if (!this.#sliding) return;
			this.#sliding = false;
			this.#suppressNextClick();
			_fr0st_query.default.removeClass(this.#outerContainer, this.constructor.classes.dragging);
			this.#animateState(this.#isCheckedPosition());
		}
		/**
		* Attaches input, keyboard, click, mouse, and touch events.
		*/
		#events() {
			if (this.#form) {
				this.#resetHandler = (event) => {
					const animationId = this.#animationId;
					this.#pendingResets.set(event, animationId);
					this.#window.setTimeout(() => {
						this.#pendingResets.delete(event);
						if (this.node && !event.defaultPrevented && animationId === this.#animationId) this.#resetState();
					}, 0);
				};
				_fr0st_query.default.addEvent(this.#form, "reset.ui.switch", this.#resetHandler);
			}
			_fr0st_query.default.addEvent(this.node, "focus.ui.switch", (_) => {
				_fr0st_query.default.focus(this.#outerContainer);
			});
			_fr0st_query.default.addEvent(this.node, "change.ui.switch", (e) => {
				if (e.skipUpdate || this.#sliding) return;
				this.#animateState(this.getState());
			});
			_fr0st_query.default.addEvent(this.#outerContainer, "keydown.ui.switch", (e) => {
				if (!["Enter", "Space"].includes(e.code) || _fr0st_query.default.is(this.node, ":disabled")) return;
				e.preventDefault();
				if (!e.repeat) this.toggleState();
			});
			_fr0st_query.default.addEvent(this.#outerContainer, "click.ui.switch", (e) => {
				if (e.button || _fr0st_query.default.is(this.node, ":disabled")) return;
				e.preventDefault();
				if (this.#suppressClick) {
					this.#clearClickSuppression();
					return;
				}
				_fr0st_query.default.focus(this.#outerContainer);
				this.toggleState();
			});
			const dragEvent = _fr0st_query.default.mouseDragFactory((e) => this.#startDrag(e), (e) => this.#moveDrag(e), (_) => this.#endDrag(), {
				debounce: false,
				passive: false,
				preventDefault: false
			});
			_fr0st_query.default.addEvent(this.#outerContainer, "mousedown.ui.switch touchstart.ui.switch", dragEvent);
		}
		/**
		* Gets the rendered horizontal translation of the Switch track.
		* @returns {number} The rendered horizontal translation in pixels.
		*/
		#getRenderedX() {
			const transform = _fr0st_query.default.css(this.#container, "transform");
			if (!transform || transform === "none") return this.#currentX;
			const x = new (this.#window.DOMMatrixReadOnly || this.#window.DOMMatrix)(transform).m41;
			return Number.isFinite(x) ? x : this.#currentX;
		}
		/**
		* Gets the translation for a checkbox state in the current text direction.
		* @param {boolean} checked Whether the checkbox is checked.
		* @returns {number} The horizontal translation in pixels.
		*/
		#getTargetX(checked) {
			if (checked) return 0;
			return this.#rtl ? this.#toggleWidth : -this.#toggleWidth;
		}
		/**
		* Determines which state is nearest to the current drag position.
		* @returns {boolean} Whether the checked state is nearest.
		*/
		#isCheckedPosition() {
			return Math.abs(this.#currentX - this.#getTargetX(true)) < Math.abs(this.#currentX - this.#getTargetX(false));
		}
		/**
		* Updates the Switch position for an active pointer drag.
		* @param {MouseEvent|TouchEvent} e The pointer move event.
		*/
		#moveDrag(e) {
			if (!this.node || !this.#dragActive || this.#toggleWidth <= 0) return;
			const { x } = (0, _fr0st_ui.getPosition)(e);
			if (!Number.isFinite(x)) return;
			if (!this.#sliding && Math.abs(x - this.#dragStartX) < Switch.#DRAG_THRESHOLD) return;
			if (!this.#sliding) {
				this.#sliding = true;
				_fr0st_query.default.addClass(this.#outerContainer, this.constructor.classes.dragging);
			}
			if (e.cancelable) e.preventDefault();
			const minX = this.#rtl ? 0 : -this.#toggleWidth;
			const maxX = this.#rtl ? this.#toggleWidth : 0;
			this.#currentX = _fr0st_query.default._clamp(x - this.#dragOffsetX, minX, maxX);
			_fr0st_query.default.setStyle(this.#container, { transform: `translateX(${this.#currentX}px)` });
		}
		/**
		* Measures and positions the rendered Switch for the current text direction.
		*/
		#refresh() {
			const labelWidth = Number(this.options.labelWidth);
			const measuredOnWidth = Number(_fr0st_query.default.width(this.#onToggle)) || 0;
			const measuredOffWidth = Number(_fr0st_query.default.width(this.#offToggle)) || 0;
			this.#toggleWidth = Number.isFinite(labelWidth) && labelWidth > 0 ? labelWidth : Math.max(measuredOnWidth, measuredOffWidth);
			const dividerWidth = Number(this.options.dividerWidth);
			this.#dividerWidth = Number.isFinite(dividerWidth) && dividerWidth > 0 ? dividerWidth : this.#toggleWidth / 2;
			const outerWidth = this.#toggleWidth + this.#dividerWidth;
			const totalWidth = this.#toggleWidth * 2 + this.#dividerWidth;
			this.#rtl = _fr0st_query.default.css(this.#outerContainer, "direction") === "rtl";
			const startX = this.#getTargetX(this.#targetState);
			_fr0st_query.default.setStyle(this.#outerContainer, { width: `${outerWidth}px` });
			_fr0st_query.default.setStyle(this.#container, { width: `${totalWidth}px` });
			this.#setPosition(startX);
			_fr0st_query.default.setStyle(this.#onToggle, { width: `${this.#toggleWidth}px` });
			_fr0st_query.default.setStyle(this.#divider, { width: `${this.#dividerWidth}px` });
			_fr0st_query.default.setStyle(this.#offToggle, { width: `${this.#toggleWidth}px` });
		}
		/**
		* Synchronizes disabled styling and focusability with the checkbox.
		*/
		#refreshDisabled() {
			const disabled = _fr0st_query.default.is(this.node, ":disabled");
			if (disabled) _fr0st_query.default.addClass(this.#outerContainer, this.constructor.classes.disabled);
			else _fr0st_query.default.removeClass(this.#outerContainer, this.constructor.classes.disabled);
			_fr0st_query.default.setAttribute(this.#outerContainer, {
				"aria-disabled": disabled,
				"tabindex": disabled ? -1 : 0
			});
		}
		/**
		* Renders the Switch and records input and label attributes for disposal.
		*/
		#render() {
			this.#hidden = _fr0st_query.default.hasClass(this.node, this.constructor.classes.hide);
			this.#tabIndex = _fr0st_query.default.getAttribute(this.node, "tabindex");
			const labelledBy = /* @__PURE__ */ new Set();
			const inputLabelledBy = _fr0st_query.default.getAttribute(this.node, "aria-labelledby");
			if (inputLabelledBy) for (const id of inputLabelledBy.split(/\s+/)) labelledBy.add(id);
			for (const label of this.node.labels || []) {
				let id = _fr0st_query.default.getAttribute(label, "id");
				if (!id) {
					id = (0, _fr0st_ui.generateId)("switch-label");
					_fr0st_query.default.setAttribute(label, { id });
					this.#generatedLabelIds.set(label, id);
				}
				labelledBy.add(id);
			}
			const attributes = {
				"role": "switch",
				"aria-checked": this.getState(),
				"aria-required": Boolean(_fr0st_query.default.getProperty(this.node, "required"))
			};
			const direction = _fr0st_query.default.getAttribute(this.node, "dir");
			const ariaLabel = _fr0st_query.default.getAttribute(this.node, "aria-label");
			if (labelledBy.size) attributes["aria-labelledby"] = Array.from(labelledBy).join(" ");
			else if (ariaLabel) attributes["aria-label"] = ariaLabel;
			if (direction) attributes.dir = direction;
			this.#outerContainer = _fr0st_query.default.create("div", {
				class: [this.constructor.classes.outer, `switch-${this.options.size}`],
				attributes
			});
			this.#container = _fr0st_query.default.create("div", {
				class: this.constructor.classes.switch,
				attributes: { "aria-hidden": true }
			});
			this.#onToggle = _fr0st_query.default.create("div", {
				class: [this.constructor.classes.toggleOn, this.options.onStyle],
				text: this.options.onText
			});
			this.#divider = _fr0st_query.default.create("div", {
				class: [this.constructor.classes.toggleDivider, this.options.dividerStyle],
				text: ""
			});
			this.#offToggle = _fr0st_query.default.create("div", {
				class: [this.constructor.classes.toggleOff, this.options.offStyle],
				text: this.options.offText
			});
			_fr0st_query.default.append(this.#container, this.#onToggle);
			_fr0st_query.default.append(this.#container, this.#divider);
			_fr0st_query.default.append(this.#container, this.#offToggle);
			_fr0st_query.default.append(this.#outerContainer, this.#container);
			_fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			_fr0st_query.default.setAttribute(this.node, { tabindex: -1 });
			_fr0st_query.default.before(this.node, this.#outerContainer);
		}
		/**
		* Restores the rendered state after a native form reset.
		*/
		#resetState() {
			this.#cancelAnimation();
			this.#clearClickSuppression();
			this.#dragActive = false;
			this.#sliding = false;
			_fr0st_query.default.removeClass(this.#outerContainer, this.constructor.classes.dragging);
			this.#targetState = this.getState();
			this.#setPosition(this.#getTargetX(this.#targetState));
			this.#setState(this.#targetState);
		}
		/**
		* Sets the Switch track position without a CSS transition.
		* @param {number} x The horizontal translation in pixels.
		*/
		#setPosition(x) {
			this.#currentX = x;
			_fr0st_query.default.setStyle(this.#container, {
				transition: "none",
				transform: `translateX(${x}px)`
			});
			_fr0st_query.default.css(this.#container, "transform");
			_fr0st_query.default.setStyle(this.#container, { transition: "" });
		}
		/**
		* Synchronizes the ARIA and checkbox state and emits a change event when needed.
		* @param {boolean} checked Whether the checkbox is checked.
		*/
		#setState(checked) {
			_fr0st_query.default.setAttribute(this.#outerContainer, { "aria-checked": checked });
			if (this.getState() === checked) return;
			_fr0st_query.default.setProperty(this.node, { checked });
			_fr0st_query.default.triggerEvent(this.node, "change.ui.switch", { data: { skipUpdate: true } });
		}
		/**
		* Starts tracking a mouse or touch drag from the current Switch position.
		* @param {MouseEvent|TouchEvent} e The pointer down event.
		* @returns {boolean|undefined} `false` when the drag must not start.
		*/
		#startDrag(e) {
			if (!this.node || e.type === "mousedown" && e.button !== 0 || _fr0st_query.default.is(this.node, ":disabled")) return false;
			const { x } = (0, _fr0st_ui.getPosition)(e);
			if (!Number.isFinite(x)) return false;
			this.#cancelAnimation();
			this.#dragActive = true;
			this.#sliding = false;
			this.#dragStartX = x;
			this.#dragOffsetX = x - this.#currentX;
			_fr0st_query.default.focus(this.#outerContainer);
		}
		/**
		* Suppresses the click generated after a completed mouse or touch drag.
		*/
		#suppressNextClick() {
			this.#clearClickSuppression();
			this.#suppressClick = true;
			this.#suppressClickTimer = this.#window.setTimeout((_) => this.#clearClickSuppression(), 500);
		}
	};

//#endregion
//#region src/js/index.js
/** @import { SwitchOptions } from './switch.js'; */
	/** @type {SwitchOptions} */
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
		dragging: "switch-dragging",
		hide: "visually-hidden",
		outer: "switch-outer",
		switch: "switch",
		toggleDivider: "switch-toggle-divider",
		toggleOff: "switch-toggle-off",
		toggleOn: "switch-toggle-on"
	};
	(0, _fr0st_ui.initComponent)("switch", Switch);
	var js_default = Switch;

//#endregion
exports.Switch = js_default;
});
//# sourceMappingURL=frost-ui-switch.js.map