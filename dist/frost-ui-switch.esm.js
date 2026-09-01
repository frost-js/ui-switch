import { BaseComponent, generateId, getPosition, initComponent } from "@fr0st/ui";
import $ from "@fr0st/query";

//#region src/js/switch.js
/**
* Switch Class
* @class
*/
var Switch = class extends BaseComponent {
	/**
	* New Switch constructor.
	* @param {HTMLElement} node The input node.
	* @param {object} [options] The options to create the Switch with.
	*/
	constructor(node, options) {
		super(node, options);
		const id = $.getAttribute(this._node, "id");
		this._label = $.findOne(`label[for="${id}"]`);
		if (this._label && !$.getAttribute(this._label, "id")) {
			$.setAttribute(this._label, { id: generateId("switch-label") });
			this._labelId = true;
		}
		this._render();
		this._refresh();
		this._refreshDisabled();
		this._events();
		this._currentX = -this._toggleWidth;
		const checked = $.getProperty(this._node, "checked");
		this._animateState(checked);
	}
	/**
	* Disable the Switch.
	*/
	disable() {
		$.setAttribute(this._node, { disabled: true });
		this._refreshDisabled();
	}
	/**
	* Dispose the Switch.
	*/
	dispose() {
		if (this._labelId) $.removeAttribute(this._label, "id");
		$.remove(this._outerContainer);
		$.removeEvent(this._node, "focus.ui.switch");
		$.removeEvent(this._node, "change.ui.switch");
		$.removeAttribute(this._node, "tabindex");
		$.removeClass(this._node, this.constructor.classes.hide);
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
		$.removeAttribute(this._node, "disabled");
		this._refreshDisabled();
	}
	/**
	* Get the switch checkbox state.
	* @return {Boolean} Whether the switch checkbox is enabled.
	*/
	getState() {
		return $.getProperty(this._node, "checked");
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
	$.addEvent(this._node, "focus.ui.switch", (_) => {
		$.focus(this._outerContainer);
	});
	$.addEvent(this._node, "change.ui.switch", (e) => {
		if (e.skipUpdate || $.getDataset(this._container, "uiAnimating") || $.getDataset(this._container, "uiSliding")) return;
		const checked = this.getState();
		this._animateState(checked);
	});
	$.addEvent(this._outerContainer, "keyup.ui.switch", (e) => {
		if (e.code !== "Space" || $.getDataset(this._container, "uiAnimating") || $.getDataset(this._container, "uiSliding")) return;
		this.toggleState();
	});
	$.addEvent(this._outerContainer, "click.ui.switch", (e) => {
		if (e.button || $.getDataset(this._container, "uiAnimating") || $.getDataset(this._container, "uiSliding")) return;
		this.toggleState();
	});
	let startX;
	const downEvent = (e) => {
		if (e.button || $.getDataset(this._container, "uiAnimating") || $.getDataset(this._container, "uiSliding")) return false;
		startX = getPosition(e).x - this._currentX;
	};
	const moveEvent = (e) => {
		if (!$.getDataset(this._container, "uiSliding")) $.setDataset(this._container, { uiSliding: true });
		const currentX = getPosition(e).x;
		this._currentX = $._clamp(currentX - startX, -this._toggleWidth, 0);
		$.setStyle(this._container, { transform: `translateX(${this._currentX}px)` });
	};
	const upEvent = (_) => {
		if (!$.getDataset(this._container, "uiSliding")) return;
		const checked = Math.abs(this._currentX) < this._toggleWidth / 2;
		setTimeout((_) => {
			$.removeDataset(this._container, "uiSliding");
			this._animateState(checked);
		}, 0);
	};
	const dragEvent = $.mouseDragFactory(downEvent, moveEvent, upEvent, { preventDefault: false });
	$.addEvent(this._outerContainer, "mousedown.ui.switch touchstart.ui.switch", dragEvent);
}

//#endregion
//#region src/js/prototype/helpers.js
/**
* Animate the switch checkbox state.
* @param {Boolean} checked Whether to enable the switch checkbox.
*/
function _animateState(checked) {
	if ($.getDataset(this._container, "uiSliding")) return;
	if ($.getDataset(this._container, "uiAnimating")) $.stop(this._container, { finish: false });
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
		$.setStyle(this._container, { transform: `translateX(${targetX}px)` });
		this._currentX = targetX;
		this._setState(checked);
		$.removeDataset(this._container, "uiAnimating");
		return;
	}
	const progressRemaining = 1 - progress;
	$.setDataset(this._container, { uiAnimating: true });
	$.animate(this._container, (node, newProgress) => {
		this._currentX = $._lerp(this._currentX, targetX, progress + newProgress * progressRemaining);
		$.setStyle(node, { transform: `translateX(${this._currentX}px)` });
	}, { duration: this._options.duration * progressRemaining }).then((_) => {
		$.removeDataset(this._container, "uiAnimating");
		this._currentX = targetX;
		this._setState(checked);
	}).catch((_) => {
		$.removeDataset(this._container, "uiAnimating");
	});
}
/**
* Refresh the label/divider widths.
*/
function _refresh() {
	if (this._options.labelWidth) this._toggleWidth = this._options.labelWidth;
	else this._toggleWidth = Math.max($.width(this._onToggle), $.width(this._offToggle));
	if (this._options.dividerWidth) this._dividerWidth = this._options.dividerWidth;
	else this._dividerWidth = this._toggleWidth / 2;
	const outerWidth = this._toggleWidth + this._dividerWidth;
	const totalWidth = this._toggleWidth * 2 + this._dividerWidth;
	$.setStyle(this._outerContainer, { width: `${outerWidth}px` });
	$.setStyle(this._container, {
		width: `${totalWidth}px`,
		transform: `translateX(${-this._toggleWidth}px)`
	});
	$.setStyle(this._onToggle, { width: `${this._toggleWidth}px` });
	$.setStyle(this._divider, { width: `${this._dividerWidth}px` });
	$.setStyle(this._offToggle, { width: `${this._toggleWidth}px` });
}
/**
* Refresh the disabled styling.
*/
function _refreshDisabled() {
	const disabled = $.is(this._node, ":disabled");
	if (disabled) $.addClass(this._outerContainer, this.constructor.classes.disabled);
	else $.removeClass(this._outerContainer, this.constructor.classes.disabled);
	$.setAttribute(this._outerContainer, {
		"aria-disabled": disabled,
		"tabindex": disabled ? -1 : 0
	});
}
/**
* Set the switch checkbox state.
* @param {Boolean} checked Whether to enable the switch checkbox.
*/
function _setState(checked) {
	$.setAttribute(this._outerContainer, { "aria-checked": checked });
	if (this.getState() === checked) return;
	$.setProperty(this._node, { checked });
	$.triggerEvent(this._node, "change.ui.switch", { data: { skipUpdate: true } });
}

//#endregion
//#region src/js/prototype/render.js
/**
* Render the switch.
*/
function _render() {
	this._outerContainer = $.create("div", {
		class: [this.constructor.classes.outer, `switch-${this._options.size}`],
		attributes: {
			"role": "switch",
			"aria-checked": this.getState(),
			"aria-required": $.getProperty(this._node, "required")
		}
	});
	if (this._label) {
		const labelId = $.getAttribute(this._label, "id");
		$.setAttribute(this._outerContainer, { "aria-labelledby": labelId });
	}
	this._container = $.create("div", {
		class: this.constructor.classes.switch,
		attributes: { "aria-hidden": true }
	});
	this._onToggle = $.create("div", {
		class: [this.constructor.classes.toggleOn, this._options.onStyle],
		text: this._options.onText
	});
	this._divider = $.create("div", {
		class: [this.constructor.classes.toggleDivider, this._options.dividerStyle],
		text: ""
	});
	this._offToggle = $.create("div", {
		class: [this.constructor.classes.toggleOff, this._options.offStyle],
		text: this._options.offText
	});
	$.append(this._container, this._onToggle);
	$.append(this._container, this._divider);
	$.append(this._container, this._offToggle);
	$.append(this._outerContainer, this._container);
	$.addClass(this._node, this.constructor.classes.hide);
	$.setAttribute(this._node, { tabindex: -1 });
	$.before(this._node, this._outerContainer);
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
initComponent("switch", Switch);
var js_default = Switch;

//#endregion
export { js_default as default };
//# sourceMappingURL=frost-ui-switch.esm.js.map