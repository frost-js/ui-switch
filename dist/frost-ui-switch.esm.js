import { BaseComponent, generateId, getPosition, initComponent, waitForTransition } from "@fr0st/ui";
import $ from "@fr0st/query";

//#region src/js/switch.js
var window = $.getWindow();
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
var Switch = class Switch extends BaseComponent {
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
	*/
	constructor(node, options) {
		super(node, options);
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
		$.setAttribute(this.node, { disabled: true });
		this.#refreshDisabled();
	}
	/** @inheritdoc */
	dispose() {
		this.#cancelAnimation();
		this.#clearClickSuppression();
		this.#pendingResets.clear();
		this.#resizeObserver?.disconnect();
		for (const [label, id] of this.#generatedLabelIds) if ($.getAttribute(label, "id") === id) $.removeAttribute(label, "id");
		$.remove(this.#outerContainer);
		$.removeEvent(this.node, "focus.ui.switch");
		$.removeEvent(this.node, "change.ui.switch");
		if (this.#form) $.removeEvent(this.#form, "reset.ui.switch", this.#resetHandler);
		if (this.#hidden) $.addClass(this.node, this.constructor.classes.hide);
		else $.removeClass(this.node, this.constructor.classes.hide);
		if (this.#tabIndex === null) $.removeAttribute(this.node, "tabindex");
		else $.setAttribute(this.node, { tabindex: this.#tabIndex });
		this.#container = null;
		this.#divider = null;
		this.#form = null;
		this.#generatedLabelIds = null;
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
		$.removeAttribute(this.node, "disabled");
		this.#refreshDisabled();
	}
	/**
	* Gets the checkbox state.
	* @returns {boolean} Whether the checkbox is checked.
	*/
	getState() {
		return Boolean($.getProperty(this.node, "checked"));
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
		$.setStyle(this.#outerContainer, {
			"--ui-switch-transition-duration": `${duration}ms`,
			"--ui-switch-transition-scale": durationScale
		});
		$.css(this.#container, "transform");
		$.setStyle(this.#container, { transform: `translateX(${targetX}px)` });
		waitForTransition(this.#container, ["transform"]).then((_) => {
			if (animationId !== this.#animationId || !this.node || [...this.#pendingResets].some(([event, resetAnimationId]) => resetAnimationId === animationId && !event.defaultPrevented)) return;
			this.#animating = false;
			this.#currentX = targetX;
			$.setStyle(this.#outerContainer, { "--ui-switch-transition-scale": "" });
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
		$.setStyle(this.#outerContainer, { "--ui-switch-transition-scale": "" });
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
		$.removeClass(this.#outerContainer, this.constructor.classes.dragging);
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
				window.setTimeout(() => {
					this.#pendingResets.delete(event);
					if (this.node && !event.defaultPrevented && animationId === this.#animationId) this.#resetState();
				}, 0);
			};
			$.addEvent(this.#form, "reset.ui.switch", this.#resetHandler);
		}
		$.addEvent(this.node, "focus.ui.switch", (_) => {
			$.focus(this.#outerContainer);
		});
		$.addEvent(this.node, "change.ui.switch", (e) => {
			if (e.skipUpdate || this.#sliding) return;
			this.#animateState(this.getState());
		});
		$.addEvent(this.#outerContainer, "keydown.ui.switch", (e) => {
			if (!["Enter", "Space"].includes(e.code) || $.is(this.node, ":disabled")) return;
			e.preventDefault();
			if (!e.repeat) this.toggleState();
		});
		$.addEvent(this.#outerContainer, "click.ui.switch", (e) => {
			if (e.button || $.is(this.node, ":disabled")) return;
			e.preventDefault();
			if (this.#suppressClickTimer !== null) {
				this.#clearClickSuppression();
				return;
			}
			$.focus(this.#outerContainer);
			this.toggleState();
		});
		const dragEvent = $.mouseDragFactory((e) => this.#startDrag(e), (e) => this.#moveDrag(e), (_) => this.#endDrag(), {
			debounce: false,
			passive: false,
			preventDefault: false
		});
		$.addEvent(this.#outerContainer, "mousedown.ui.switch touchstart.ui.switch", dragEvent);
	}
	/**
	* Gets the rendered horizontal translation of the Switch track.
	* @returns {number} The rendered horizontal translation in pixels.
	*/
	#getRenderedX() {
		const transform = $.css(this.#container, "transform");
		if (!transform || transform === "none") return this.#currentX;
		const x = new (window.DOMMatrixReadOnly || window.DOMMatrix)(transform).m41;
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
		const { x } = getPosition(e);
		if (!Number.isFinite(x)) return;
		if (!this.#sliding && Math.abs(x - this.#dragStartX) < Switch.#DRAG_THRESHOLD) return;
		if (!this.#sliding) {
			this.#sliding = true;
			$.addClass(this.#outerContainer, this.constructor.classes.dragging);
		}
		if (e.cancelable) e.preventDefault();
		const minX = this.#rtl ? 0 : -this.#toggleWidth;
		const maxX = this.#rtl ? this.#toggleWidth : 0;
		this.#currentX = $._clamp(x - this.#dragOffsetX, minX, maxX);
		$.setStyle(this.#container, { transform: `translateX(${this.#currentX}px)` });
	}
	/**
	* Measures and positions the rendered Switch for the current text direction.
	*/
	#refresh() {
		const labelWidth = Number(this.options.labelWidth);
		const measuredOnWidth = Number($.width(this.#onToggle)) || 0;
		const measuredOffWidth = Number($.width(this.#offToggle)) || 0;
		this.#toggleWidth = Number.isFinite(labelWidth) && labelWidth > 0 ? labelWidth : Math.max(measuredOnWidth, measuredOffWidth);
		if (this.#toggleWidth <= 0) {
			if (!this.#resizeObserver) {
				this.#resizeObserver = new window.ResizeObserver(() => {
					if (this.node) this.#refresh();
				});
				this.#resizeObserver.observe(this.#outerContainer);
			}
			return;
		}
		const dividerWidth = Number(this.options.dividerWidth);
		this.#dividerWidth = Number.isFinite(dividerWidth) && dividerWidth > 0 ? dividerWidth : this.#toggleWidth / 2;
		const outerWidth = this.#toggleWidth + this.#dividerWidth;
		const totalWidth = this.#toggleWidth * 2 + this.#dividerWidth;
		this.#rtl = $.css(this.#outerContainer, "direction") === "rtl";
		const startX = this.#getTargetX(this.#targetState);
		$.setStyle(this.#outerContainer, { width: `${outerWidth}px` });
		$.setStyle(this.#container, { width: `${totalWidth}px` });
		this.#setPosition(startX);
		$.setStyle(this.#onToggle, { width: `${this.#toggleWidth}px` });
		$.setStyle(this.#divider, { width: `${this.#dividerWidth}px` });
		$.setStyle(this.#offToggle, { width: `${this.#toggleWidth}px` });
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
	}
	/**
	* Synchronizes disabled styling and focusability with the checkbox.
	*/
	#refreshDisabled() {
		const disabled = $.is(this.node, ":disabled");
		if (disabled) $.addClass(this.#outerContainer, this.constructor.classes.disabled);
		else $.removeClass(this.#outerContainer, this.constructor.classes.disabled);
		$.setAttribute(this.#outerContainer, {
			"aria-disabled": disabled,
			"tabindex": disabled ? -1 : 0
		});
	}
	/**
	* Renders the Switch and records input and label attributes for disposal.
	*/
	#render() {
		this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
		this.#tabIndex = $.getAttribute(this.node, "tabindex");
		const labelledBy = /* @__PURE__ */ new Set();
		const inputLabelledBy = $.getAttribute(this.node, "aria-labelledby");
		if (inputLabelledBy) for (const id of inputLabelledBy.split(/\s+/)) labelledBy.add(id);
		for (const label of this.node.labels || []) {
			let id = $.getAttribute(label, "id");
			if (!id) {
				id = generateId("switch-label");
				$.setAttribute(label, { id });
				this.#generatedLabelIds.set(label, id);
			}
			labelledBy.add(id);
		}
		const attributes = {
			"role": "switch",
			"aria-checked": this.getState(),
			"aria-required": Boolean($.getProperty(this.node, "required"))
		};
		const direction = $.getAttribute(this.node, "dir");
		const ariaLabel = $.getAttribute(this.node, "aria-label");
		if (labelledBy.size) attributes["aria-labelledby"] = Array.from(labelledBy).join(" ");
		else if (ariaLabel) attributes["aria-label"] = ariaLabel;
		if (direction) attributes.dir = direction;
		this.#outerContainer = $.create("div", {
			class: [this.constructor.classes.outer, `switch-${this.options.size}`],
			attributes
		});
		this.#container = $.create("div", {
			class: this.constructor.classes.switch,
			attributes: { "aria-hidden": true }
		});
		this.#onToggle = $.create("div", {
			class: [this.constructor.classes.toggleOn, this.options.onStyle],
			text: this.options.onText
		});
		this.#divider = $.create("div", {
			class: [this.constructor.classes.toggleDivider, this.options.dividerStyle],
			text: ""
		});
		this.#offToggle = $.create("div", {
			class: [this.constructor.classes.toggleOff, this.options.offStyle],
			text: this.options.offText
		});
		$.append(this.#container, this.#onToggle);
		$.append(this.#container, this.#divider);
		$.append(this.#container, this.#offToggle);
		$.append(this.#outerContainer, this.#container);
		$.addClass(this.node, this.constructor.classes.hide);
		$.setAttribute(this.node, { tabindex: -1 });
		$.before(this.node, this.#outerContainer);
	}
	/**
	* Restores the rendered state after a native form reset.
	*/
	#resetState() {
		this.#cancelAnimation();
		this.#clearClickSuppression();
		this.#dragActive = false;
		this.#sliding = false;
		$.removeClass(this.#outerContainer, this.constructor.classes.dragging);
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
		$.setStyle(this.#container, {
			transition: "none",
			transform: `translateX(${x}px)`
		});
		$.css(this.#container, "transform");
		$.setStyle(this.#container, { transition: "" });
	}
	/**
	* Synchronizes the ARIA and checkbox state and emits a change event when needed.
	* @param {boolean} checked Whether the checkbox is checked.
	*/
	#setState(checked) {
		$.setAttribute(this.#outerContainer, { "aria-checked": checked });
		if (this.getState() === checked) return;
		$.setProperty(this.node, { checked });
		$.triggerEvent(this.node, "change.ui.switch", { data: { skipUpdate: true } });
	}
	/**
	* Starts tracking a mouse or touch drag from the current Switch position.
	* @param {MouseEvent|TouchEvent} e The pointer down event.
	* @returns {boolean|undefined} `false` when the drag must not start.
	*/
	#startDrag(e) {
		if (!this.node || e.type === "mousedown" && e.button !== 0 || $.is(this.node, ":disabled")) return false;
		const { x } = getPosition(e);
		if (!Number.isFinite(x)) return false;
		this.#cancelAnimation();
		this.#dragActive = true;
		this.#sliding = false;
		this.#dragStartX = x;
		this.#dragOffsetX = x - this.#currentX;
		$.focus(this.#outerContainer);
	}
	/**
	* Suppresses the click generated after a completed mouse or touch drag.
	*/
	#suppressNextClick() {
		this.#clearClickSuppression();
		this.#suppressClickTimer = window.setTimeout((_) => this.#clearClickSuppression(), 500);
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
initComponent("switch", Switch);
var js_default = Switch;

//#endregion
export { js_default as default };
//# sourceMappingURL=frost-ui-switch.esm.js.map