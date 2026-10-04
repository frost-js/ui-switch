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
	var window = _fr0st_query.default.getWindow();
	var ariaAttributes = [
		"aria-describedby",
		"aria-errormessage",
		"aria-invalid",
		"aria-required"
	];
	/**
	* @typedef {object} SwitchOptions
	* @property {boolean} [animate=true] Whether to transition state changes.
	* @property {string} [dividerStyle='bg-body-tertiary'] The class applied to the divider.
	* @property {number|null} [dividerWidth=null] The divider width in pixels, or `null` to use half the resolved label width.
	* @property {number} [duration=500] The full CSS transition duration in milliseconds.
	* @property {number|null} [labelWidth=null] The width of both labels in pixels, or `null` to use the wider measured label.
	* @property {string} [offStyle='text-bg-secondary'] The class applied to the off label.
	* @property {string} [offText='OFF'] The off label text.
	* @property {string} [onStyle='text-bg-primary'] The class applied to the on label.
	* @property {string} [onText='ON'] The on label text.
	* @property {'xs'|'sm'|'md'|'lg'|'xl'} [size='md'] The switch size suffix.
	*/
	/**
	* Controls a checkbox using a sliding switch interface.
	* @augments {BaseComponent<SwitchOptions>}
	*/
	var Switch = class Switch extends _fr0st_ui.BaseComponent {
		static classes = {
			disabled: "switch-disabled",
			dragging: "switch-dragging",
			hide: "visually-hidden",
			outer: "switch-outer",
			switch: "switch",
			toggleDivider: "switch-toggle-divider",
			toggleOff: "switch-toggle-off",
			toggleOn: "switch-toggle-on"
		};
		/** @type {SwitchOptions} */
		static defaults = {
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
		static #DRAG_THRESHOLD = 3;
		#animating = false;
		#animationId = 0;
		#ariaHidden;
		#container;
		#currentX = 0;
		#divider;
		#dragActive = false;
		#form;
		#generatedLabelIds = /* @__PURE__ */ new Map();
		#hidden;
		#observer;
		#offToggle;
		#onToggle;
		#outerContainer;
		#pendingResets = /* @__PURE__ */ new Map();
		#resetHandler;
		#resizeObserver;
		#rtl = false;
		#sliding = false;
		#suppressClickTimer = null;
		#tabIndex;
		#targetState;
		#toggleWidth = 0;
		/**
		* Creates a Switch.
		* @param {HTMLInputElement} node The checkbox input node.
		* @param {SwitchOptions} [options] The Switch options.
		* @throws {TypeError} When the node is not a checkbox input element.
		*/
		constructor(node, options) {
			if (!_fr0st_query.default.is(node, "input[type=\"checkbox\"]")) throw new TypeError("Switch must be created on a checkbox input element.");
			super(node, options);
			try {
				this.#form = _fr0st_query.default.getProperty(this.node, "form");
				this.#hidden = _fr0st_query.default.hasClass(this.node, this.constructor.classes.hide);
				this.#tabIndex = _fr0st_query.default.getAttribute(this.node, "tabindex");
				this.#ariaHidden = _fr0st_query.default.getAttribute(this.node, "aria-hidden");
				this.#targetState = this.getState();
				const focused = _fr0st_query.default.is(this.node, ":focus");
				this.#render();
				this.#refresh();
				this.#refreshState();
				this.#events();
				if (focused) _fr0st_query.default.focus(this.#outerContainer);
			} catch (error) {
				this.dispose();
				throw error;
			}
		}
		/**
		* Disables the Switch.
		*/
		disable() {
			_fr0st_query.default.setAttribute(this.node, { disabled: true });
			this.#refreshState();
		}
		/** @inheritdoc */
		dispose() {
			if (!this.node) return;
			this.#cancelAnimation();
			this.#clearClickSuppression();
			this.#pendingResets.clear();
			this.#resizeObserver?.disconnect();
			this.#observer?.disconnect();
			for (const [label, id] of this.#generatedLabelIds || []) if (_fr0st_query.default.getAttribute(label, "id") === id) _fr0st_query.default.removeAttribute(label, "id");
			_fr0st_query.default.remove(this.#outerContainer);
			_fr0st_query.default.removeEvent(this.node, "focus.ui.switch");
			_fr0st_query.default.removeEvent(this.node, "change.ui.switch");
			if (this.#form && this.#resetHandler) _fr0st_query.default.removeEvent(this.#form, "reset.ui.switch", this.#resetHandler);
			if (this.#hidden) _fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			else _fr0st_query.default.removeClass(this.node, this.constructor.classes.hide);
			if (this.#ariaHidden === null) _fr0st_query.default.removeAttribute(this.node, "aria-hidden");
			else _fr0st_query.default.setAttribute(this.node, { "aria-hidden": this.#ariaHidden });
			if (this.#tabIndex === null) _fr0st_query.default.removeAttribute(this.node, "tabindex");
			else _fr0st_query.default.setAttribute(this.node, { tabindex: this.#tabIndex });
			this.#container = null;
			this.#divider = null;
			this.#form = null;
			this.#generatedLabelIds = null;
			this.#observer = null;
			this.#offToggle = null;
			this.#onToggle = null;
			this.#outerContainer = null;
			this.#resetHandler = null;
			this.#resizeObserver = null;
			super.dispose();
		}
		/**
		* Enables the Switch.
		*/
		enable() {
			_fr0st_query.default.removeAttribute(this.node, "disabled");
			this.#refreshState();
		}
		/**
		* Gets the current checkbox state. Animated state changes are committed when the transition finishes.
		* @returns {boolean} Whether the checkbox is checked.
		*/
		getState() {
			return Boolean(_fr0st_query.default.getProperty(this.node, "checked"));
		}
		/**
		* Transitions to the requested checkbox state, committing it when the transition finishes.
		* Updates immediately when no transition is needed. Calls during an active slide are ignored.
		* @param {boolean} checked Whether the checkbox is checked.
		*/
		setState(checked) {
			this.#animateState(checked);
		}
		/**
		* Transitions to the opposite target state, reversing any pending state change.
		* Commits the checkbox state when the transition finishes, or immediately when no transition is needed.
		* Calls during an active slide are ignored.
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
			(0, _fr0st_ui.waitForTransition)(this.#container, ["transform"]).then(() => {
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
			const transform = _fr0st_query.default.css(this.#container, "transform");
			let currentX = this.#currentX;
			if (transform && transform !== "none") {
				const x = new (window.DOMMatrixReadOnly || window.DOMMatrix)(transform).m41;
				if (Number.isFinite(x)) currentX = x;
			}
			this.#animating = false;
			this.#setPosition(currentX);
			_fr0st_query.default.setStyle(this.#outerContainer, { "--ui-switch-transition-scale": "" });
		}
		/**
		* Clears pending click suppression after a drag.
		*/
		#clearClickSuppression() {
			if (this.#suppressClickTimer !== null) {
				window.clearTimeout(this.#suppressClickTimer);
				this.#suppressClickTimer = null;
			}
		}
		/**
		* Attaches input, keyboard, click, mouse, and touch events.
		*/
		#events() {
			if (this.#form) {
				this.#resetHandler = (event) => {
					const animationId = this.#animationId;
					this.#pendingResets.set(event, animationId);
					window.setTimeout(() => {
						this.#pendingResets.delete(event);
						if (this.node && !event.defaultPrevented && animationId === this.#animationId) this.#resetState();
					}, 0);
				};
				_fr0st_query.default.addEvent(this.#form, "reset.ui.switch", this.#resetHandler);
			}
			_fr0st_query.default.addEvent(this.node, "focus.ui.switch", () => {
				_fr0st_query.default.focus(this.#outerContainer);
			});
			_fr0st_query.default.addEvent(this.node, "change.ui.switch", (event) => {
				if (event.skipUpdate || this.#sliding) return;
				this.#animateState(this.getState());
			});
			this.#observer = new window.MutationObserver(() => {
				if (!this.node) return;
				this.#refreshState();
			});
			this.#observer.observe(this.node, {
				attributes: true,
				attributeFilter: [
					"disabled",
					"required",
					...ariaAttributes
				]
			});
			for (const fieldset of _fr0st_query.default.parents(this.node, "fieldset")) this.#observer.observe(fieldset, {
				attributes: true,
				attributeFilter: ["disabled"]
			});
			_fr0st_query.default.addEvent(this.#outerContainer, "keydown.ui.switch", (event) => {
				if (!["Enter", "Space"].includes(event.code) || _fr0st_query.default.is(this.node, ":disabled")) return;
				event.preventDefault();
				if (!event.repeat) this.toggleState();
			});
			_fr0st_query.default.addEvent(this.#outerContainer, "click.ui.switch", (event) => {
				if (event.button || _fr0st_query.default.is(this.node, ":disabled")) return;
				event.preventDefault();
				if (this.#suppressClickTimer !== null) {
					this.#clearClickSuppression();
					return;
				}
				_fr0st_query.default.focus(this.#outerContainer);
				this.toggleState();
			});
			let dragStartX = 0;
			let dragOffsetX = 0;
			const downEvent = (event) => {
				if (!this.node || event.type === "mousedown" && event.button !== 0 || _fr0st_query.default.is(this.node, ":disabled")) return false;
				const { x } = (0, _fr0st_ui.getPosition)(event);
				if (!Number.isFinite(x)) return false;
				this.#cancelAnimation();
				this.#dragActive = true;
				this.#sliding = false;
				dragStartX = x;
				dragOffsetX = x - this.#currentX;
				_fr0st_query.default.focus(this.#outerContainer);
			};
			const moveEvent = (event) => {
				if (!this.node || !this.#dragActive || this.#toggleWidth <= 0) return;
				const { x } = (0, _fr0st_ui.getPosition)(event);
				if (!Number.isFinite(x)) return;
				if (!this.#sliding && Math.abs(x - dragStartX) < Switch.#DRAG_THRESHOLD) return;
				if (!this.#sliding) {
					this.#sliding = true;
					_fr0st_query.default.addClass(this.#outerContainer, this.constructor.classes.dragging);
				}
				if (event.cancelable) event.preventDefault();
				const minX = this.#rtl ? 0 : -this.#toggleWidth;
				const maxX = this.#rtl ? this.#toggleWidth : 0;
				this.#currentX = _fr0st_query.default._clamp(x - dragOffsetX, minX, maxX);
				_fr0st_query.default.setStyle(this.#container, { transform: `translateX(${this.#currentX}px)` });
			};
			const upEvent = (event) => {
				const dragActive = this.#dragActive;
				this.#dragActive = false;
				if (!this.node) return;
				if (event.type === "touchcancel") {
					if (dragActive) this.#resetState();
					return;
				}
				if (!dragActive) {
					this.#suppressNextClick();
					return;
				}
				if (!this.#sliding) return;
				this.#sliding = false;
				this.#suppressNextClick();
				_fr0st_query.default.removeClass(this.#outerContainer, this.constructor.classes.dragging);
				this.#animateState(Math.abs(this.#currentX) < this.#toggleWidth / 2);
			};
			const dragEvent = _fr0st_query.default.mouseDragFactory(downEvent, moveEvent, upEvent, {
				debounce: false,
				passive: false,
				preventDefault: false
			});
			_fr0st_query.default.addEvent(this.#outerContainer, "mousedown.ui.switch touchstart.ui.switch", dragEvent);
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
		* Measures and positions the rendered Switch for the current text direction.
		*/
		#refresh() {
			const labelWidth = Number(this.options.labelWidth);
			this.#toggleWidth = Number.isFinite(labelWidth) && labelWidth > 0 ? labelWidth : Math.max(Number(_fr0st_query.default.width(this.#onToggle)) || 0, Number(_fr0st_query.default.width(this.#offToggle)) || 0);
			if (this.#toggleWidth <= 0) {
				if (!this.#resizeObserver) {
					this.#resizeObserver = new window.ResizeObserver(() => {
						if (this.node) this.#refresh();
					});
					this.#resizeObserver.observe(this.#outerContainer);
				}
				return;
			}
			const configuredDividerWidth = Number(this.options.dividerWidth);
			const dividerWidth = Number.isFinite(configuredDividerWidth) && configuredDividerWidth > 0 ? configuredDividerWidth : this.#toggleWidth / 2;
			const outerWidth = this.#toggleWidth + dividerWidth;
			const totalWidth = this.#toggleWidth * 2 + dividerWidth;
			this.#rtl = _fr0st_query.default.css(this.#outerContainer, "direction") === "rtl";
			const startX = this.#getTargetX(this.#targetState);
			_fr0st_query.default.setStyle(this.#outerContainer, { width: `${outerWidth}px` });
			_fr0st_query.default.setStyle(this.#container, { width: `${totalWidth}px` });
			this.#setPosition(startX);
			_fr0st_query.default.setStyle(this.#onToggle, { width: `${this.#toggleWidth}px` });
			_fr0st_query.default.setStyle(this.#divider, { width: `${dividerWidth}px` });
			_fr0st_query.default.setStyle(this.#offToggle, { width: `${this.#toggleWidth}px` });
			this.#resizeObserver?.disconnect();
			this.#resizeObserver = null;
		}
		/**
		* Synchronizes disabled styling, focusability, and inherited accessibility attributes.
		*/
		#refreshState() {
			const disabled = _fr0st_query.default.is(this.node, ":disabled");
			if (disabled) {
				if (this.#dragActive) this.#resetState();
				_fr0st_query.default.addClass(this.#outerContainer, this.constructor.classes.disabled);
			} else _fr0st_query.default.removeClass(this.#outerContainer, this.constructor.classes.disabled);
			_fr0st_query.default.setAttribute(this.#outerContainer, {
				"aria-disabled": disabled,
				"tabindex": disabled ? -1 : 0
			});
			for (const attribute of ariaAttributes) {
				let value = _fr0st_query.default.getAttribute(this.node, attribute);
				if (attribute === "aria-required" && value === null) value = Boolean(_fr0st_query.default.getProperty(this.node, "required"));
				if (value === null) _fr0st_query.default.removeAttribute(this.#outerContainer, attribute);
				else _fr0st_query.default.setAttribute(this.#outerContainer, { [attribute]: value });
			}
		}
		/**
		* Renders the Switch and records input and label attributes for disposal.
		*/
		#render() {
			const labelledBy = /* @__PURE__ */ new Set();
			const inputLabelledBy = _fr0st_query.default.getAttribute(this.node, "aria-labelledby");
			if (inputLabelledBy) for (const id of inputLabelledBy.split(/\s+/)) labelledBy.add(id);
			for (const label of _fr0st_query.default.getProperty(this.node, "labels") || []) {
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
				"aria-checked": this.getState()
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
			_fr0st_query.default.setAttribute(this.node, {
				"tabindex": -1,
				"aria-hidden": true
			});
			_fr0st_query.default.before(this.node, this.#outerContainer);
		}
		/**
		* Restores the rendered state from the checkbox and cancels active interactions.
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
		* Suppresses the click generated after a completed mouse or touch drag.
		*/
		#suppressNextClick() {
			this.#clearClickSuppression();
			this.#suppressClickTimer = window.setTimeout(() => this.#clearClickSuppression(), 500);
		}
	};

//#endregion
//#region src/js/index.js
	(0, _fr0st_ui.initComponent)("switch", Switch);
	var js_default = Switch;

//#endregion
exports.Switch = js_default;
});
//# sourceMappingURL=frost-ui-switch.js.map