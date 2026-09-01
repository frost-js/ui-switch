import $ from '@fr0st/query';
import { BaseComponent, generateId, getPosition } from '@fr0st/ui';

/**
 * @typedef {object} SwitchOptions
 * @property {boolean} [animate=true] Whether to animate state changes.
 * @property {string} [dividerStyle='bg-body-tertiary'] The class applied to the divider.
 * @property {number|null} [dividerWidth=null] The divider width in pixels, or `null` to derive it from the label width.
 * @property {number} [duration=500] The full animation duration in milliseconds.
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
export default class Switch extends BaseComponent {
    static #DRAG_THRESHOLD = 3;

    #animating = false;
    #animationId = 0;
    #container;
    #currentX = 0;
    #divider;
    #dividerWidth = 0;
    #dragOffsetX = 0;
    #dragStartX = 0;
    #generatedLabelIds = new Map;
    #hidden;
    #offToggle;
    #onToggle;
    #outerContainer;
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
        this.#targetState = this.getState();

        this.#render();
        this.#refresh();
        this.#refreshDisabled();
        this.#events();
        this.#animateState(this.#targetState);
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

        for (const [label, id] of this.#generatedLabelIds) {
            if ($.getAttribute(label, 'id') === id) {
                $.removeAttribute(label, 'id');
            }
        }

        $.remove(this.#outerContainer);
        $.removeEvent(this.node, 'focus.ui.switch');
        $.removeEvent(this.node, 'change.ui.switch');

        if (this.#hidden) {
            $.addClass(this.node, this.constructor.classes.hide);
        } else {
            $.removeClass(this.node, this.constructor.classes.hide);
        }

        if (this.#tabIndex === null) {
            $.removeAttribute(this.node, 'tabindex');
        } else {
            $.setAttribute(this.node, { tabindex: this.#tabIndex });
        }

        this.#container = null;
        this.#divider = null;
        this.#generatedLabelIds = null;
        this.#offToggle = null;
        this.#onToggle = null;
        this.#outerContainer = null;
        this.#window = null;

        super.dispose();
    }

    /**
     * Enables the Switch.
     */
    enable() {
        $.removeAttribute(this.node, 'disabled');
        this.#refreshDisabled();
    }

    /**
     * Gets the checkbox state.
     * @returns {boolean} Whether the checkbox is checked.
     */
    getState() {
        return Boolean($.getProperty(this.node, 'checked'));
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
     * Animates the Switch to a normalized checkbox state.
     * @param {boolean} checked The checkbox state to normalize.
     */
    #animateState(checked) {
        if (this.#sliding) {
            return;
        }

        checked = Boolean(checked);
        this.#cancelAnimation();
        this.#targetState = checked;

        const animationId = this.#animationId;
        const startX = Number.isFinite(this.#currentX) ?
            this.#currentX :
            this.#getTargetX(!checked);
        const targetX = this.#getTargetX(checked);
        const distance = Math.abs(targetX - startX);
        const duration = Number(this.options.duration);

        if (
            !this.options.animate ||
            this.#toggleWidth <= 0 ||
            !Number.isFinite(duration) ||
            duration <= 0 ||
            distance <= 0
        ) {
            this.#currentX = targetX;
            $.setStyle(this.#container, { transform: `translateX(${targetX}px)` });
            this.#setState(checked);
            return;
        }

        const durationScale = Math.min(distance / this.#toggleWidth, 1);
        this.#animating = true;

        $.animate(
            this.#container,
            (node, progress) => {
                this.#currentX = $._lerp(startX, targetX, progress);
                $.setStyle(node, { transform: `translateX(${this.#currentX}px)` });
            },
            { duration: duration * durationScale },
        ).then((_) => {
            if (animationId !== this.#animationId || !this.node) {
                return;
            }

            this.#animating = false;
            this.#currentX = targetX;
            $.setStyle(this.#container, { transform: `translateX(${targetX}px)` });
            this.#setState(checked);
        }).catch((_) => {
            if (animationId === this.#animationId) {
                this.#animating = false;
            }
        });
    }

    /**
     * Stops the active animation without allowing its handlers to update state.
     */
    #cancelAnimation() {
        this.#animationId++;

        if (!this.#animating || !this.#container) {
            return;
        }

        this.#animating = false;
        $.stop(this.#container, { finish: false });
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
     * Completes a pointer drag and animates to the nearest state.
     */
    #endDrag() {
        if (!this.node || !this.#sliding) {
            return;
        }

        this.#sliding = false;
        this.#suppressNextClick();
        this.#animateState(this.#isCheckedPosition());
    }

    /**
     * Attaches input, keyboard, click, mouse, and touch events.
     */
    #events() {
        $.addEvent(this.node, 'focus.ui.switch', (_) => {
            $.focus(this.#outerContainer);
        });

        $.addEvent(this.node, 'change.ui.switch', (e) => {
            if (e.skipUpdate || this.#sliding) {
                return;
            }

            this.#animateState(this.getState());
        });

        $.addEvent(this.#outerContainer, 'keydown.ui.switch', (e) => {
            if (
                !['Enter', 'Space'].includes(e.code) ||
                $.is(this.node, ':disabled')
            ) {
                return;
            }

            e.preventDefault();

            if (!e.repeat) {
                this.toggleState();
            }
        });

        $.addEvent(this.#outerContainer, 'click.ui.switch', (e) => {
            if (e.button || $.is(this.node, ':disabled')) {
                return;
            }

            e.preventDefault();

            if (this.#suppressClick) {
                this.#clearClickSuppression();
                return;
            }

            $.focus(this.#outerContainer);
            this.toggleState();
        });

        const dragEvent = $.mouseDragFactory(
            (e) => this.#startDrag(e),
            (e) => this.#moveDrag(e),
            (_) => this.#endDrag(),
            {
                debounce: false,
                passive: false,
                preventDefault: false,
            },
        );

        $.addEvent(
            this.#outerContainer,
            'mousedown.ui.switch touchstart.ui.switch',
            dragEvent,
        );
    }

    /**
     * Gets the translation for a checkbox state in the current text direction.
     * @param {boolean} checked Whether the checkbox is checked.
     * @returns {number} The horizontal translation in pixels.
     */
    #getTargetX(checked) {
        return checked === this.#rtl ? -this.#toggleWidth : 0;
    }

    /**
     * Determines which state is nearest to the current drag position.
     * @returns {boolean} Whether the checked state is nearest.
     */
    #isCheckedPosition() {
        const checkedDistance = Math.abs(this.#currentX - this.#getTargetX(true));
        const uncheckedDistance = Math.abs(this.#currentX - this.#getTargetX(false));

        return checkedDistance < uncheckedDistance;
    }

    /**
     * Updates the Switch position for an active pointer drag.
     * @param {MouseEvent|TouchEvent} e The pointer move event.
     */
    #moveDrag(e) {
        if (!this.node || this.#toggleWidth <= 0) {
            return;
        }

        const { x } = getPosition(e);

        if (!Number.isFinite(x)) {
            return;
        }

        if (
            !this.#sliding &&
            Math.abs(x - this.#dragStartX) < Switch.#DRAG_THRESHOLD
        ) {
            return;
        }

        this.#sliding = true;

        if (e.cancelable) {
            e.preventDefault();
        }

        this.#currentX = $._clamp(
            x - this.#dragOffsetX,
            -this.#toggleWidth,
            0,
        );
        $.setStyle(this.#container, { transform: `translateX(${this.#currentX}px)` });
    }

    /**
     * Measures and positions the rendered Switch for the current text direction.
     */
    #refresh() {
        const labelWidth = Number(this.options.labelWidth);
        const measuredOnWidth = Number($.width(this.#onToggle)) || 0;
        const measuredOffWidth = Number($.width(this.#offToggle)) || 0;

        this.#toggleWidth = Number.isFinite(labelWidth) && labelWidth > 0 ?
            labelWidth :
            Math.max(measuredOnWidth, measuredOffWidth);

        const dividerWidth = Number(this.options.dividerWidth);
        this.#dividerWidth = Number.isFinite(dividerWidth) && dividerWidth > 0 ?
            dividerWidth :
            this.#toggleWidth / 2;

        const outerWidth = this.#toggleWidth + this.#dividerWidth;
        const totalWidth = (this.#toggleWidth * 2) + this.#dividerWidth;

        this.#rtl = $.css(this.#outerContainer, 'direction') === 'rtl';
        this.#currentX = this.#getTargetX(false);

        $.setStyle(this.#outerContainer, { width: `${outerWidth}px` });
        $.setStyle(this.#container, {
            width: `${totalWidth}px`,
            transform: `translateX(${this.#currentX}px)`,
        });
        $.setStyle(this.#onToggle, { width: `${this.#toggleWidth}px` });
        $.setStyle(this.#divider, { width: `${this.#dividerWidth}px` });
        $.setStyle(this.#offToggle, { width: `${this.#toggleWidth}px` });
    }

    /**
     * Synchronizes disabled styling and focusability with the checkbox.
     */
    #refreshDisabled() {
        const disabled = $.is(this.node, ':disabled');

        if (disabled) {
            $.addClass(this.#outerContainer, this.constructor.classes.disabled);
        } else {
            $.removeClass(this.#outerContainer, this.constructor.classes.disabled);
        }

        $.setAttribute(this.#outerContainer, {
            'aria-disabled': disabled,
            'tabindex': disabled ? -1 : 0,
        });
    }

    /**
     * Renders the Switch and records input and label attributes for disposal.
     */
    #render() {
        this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
        this.#tabIndex = $.getAttribute(this.node, 'tabindex');

        const labelledBy = new Set;
        const inputLabelledBy = $.getAttribute(this.node, 'aria-labelledby');

        if (inputLabelledBy) {
            for (const id of inputLabelledBy.split(/\s+/)) {
                labelledBy.add(id);
            }
        }

        for (const label of this.node.labels || []) {
            let id = $.getAttribute(label, 'id');

            if (!id) {
                id = generateId('switch-label');
                $.setAttribute(label, { id });
                this.#generatedLabelIds.set(label, id);
            }

            labelledBy.add(id);
        }

        const attributes = {
            'role': 'switch',
            'aria-checked': this.getState(),
            'aria-required': Boolean($.getProperty(this.node, 'required')),
        };
        const direction = $.getAttribute(this.node, 'dir');
        const ariaLabel = $.getAttribute(this.node, 'aria-label');

        if (labelledBy.size) {
            attributes['aria-labelledby'] = Array.from(labelledBy).join(' ');
        } else if (ariaLabel) {
            attributes['aria-label'] = ariaLabel;
        }

        if (direction) {
            attributes.dir = direction;
        }

        this.#outerContainer = $.create('div', {
            class: [
                this.constructor.classes.outer,
                `switch-${this.options.size}`,
            ],
            attributes,
        });
        this.#container = $.create('div', {
            class: this.constructor.classes.switch,
            attributes: { 'aria-hidden': true },
        });
        this.#onToggle = $.create('div', {
            class: [this.constructor.classes.toggleOn, this.options.onStyle],
            text: this.options.onText,
        });
        this.#divider = $.create('div', {
            class: [this.constructor.classes.toggleDivider, this.options.dividerStyle],
            text: '',
        });
        this.#offToggle = $.create('div', {
            class: [this.constructor.classes.toggleOff, this.options.offStyle],
            text: this.options.offText,
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
     * Synchronizes the ARIA and checkbox state and emits a change event when needed.
     * @param {boolean} checked Whether the checkbox is checked.
     */
    #setState(checked) {
        $.setAttribute(this.#outerContainer, { 'aria-checked': checked });

        if (this.getState() === checked) {
            return;
        }

        $.setProperty(this.node, { checked });
        $.triggerEvent(this.node, 'change.ui.switch', { data: { skipUpdate: true } });
    }

    /**
     * Starts tracking a mouse or touch drag from the current Switch position.
     * @param {MouseEvent|TouchEvent} e The pointer down event.
     * @returns {boolean|undefined} `false` when the drag must not start.
     */
    #startDrag(e) {
        if (
            !this.node ||
            (e.type === 'mousedown' && e.button !== 0) ||
            $.is(this.node, ':disabled')
        ) {
            return false;
        }

        const { x } = getPosition(e);

        if (!Number.isFinite(x)) {
            return false;
        }

        this.#cancelAnimation();
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
        this.#suppressClick = true;
        this.#suppressClickTimer = this.#window.setTimeout(
            (_) => this.#clearClickSuppression(),
            500,
        );
    }
}
