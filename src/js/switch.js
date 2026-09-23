import $ from '@fr0st/query';
import { BaseComponent, generateId, getPosition, waitForTransition } from '@fr0st/ui';

const window = $.getWindow();

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
export default class Switch extends BaseComponent {
    static classes = {
        disabled: 'switch-disabled',
        dragging: 'switch-dragging',
        hide: 'visually-hidden',
        outer: 'switch-outer',
        switch: 'switch',
        toggleDivider: 'switch-toggle-divider',
        toggleOff: 'switch-toggle-off',
        toggleOn: 'switch-toggle-on',
    };
    /** @type {SwitchOptions} */
    static defaults = {
        size: 'md',
        onStyle: 'text-bg-primary',
        offStyle: 'text-bg-secondary',
        dividerStyle: 'bg-body-tertiary',
        onText: 'ON',
        offText: 'OFF',
        labelWidth: null,
        dividerWidth: null,
        animate: true,
        duration: 500,
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
    #generatedLabelIds = new Map;
    #hidden;
    #offToggle;
    #onToggle;
    #outerContainer;
    #pendingResets = new Map;
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

        const focused = $.is(this.node, ':focus');

        this.#render();
        this.#refresh();
        this.#refreshDisabled();
        this.#events();

        if (focused) {
            $.focus(this.#outerContainer);
        }
    }

    /**
     * Disables the Switch.
     */
    disable() {
        $.setAttribute(this.node, { disabled: true });

        if (this.#dragActive) {
            this.#resetState();
        }

        this.#refreshDisabled();
    }

    /** @inheritdoc */
    dispose() {
        this.#cancelAnimation();
        this.#clearClickSuppression();
        this.#pendingResets.clear();

        this.#resizeObserver?.disconnect();

        for (const [label, id] of this.#generatedLabelIds || []) {
            if ($.getAttribute(label, 'id') === id) {
                $.removeAttribute(label, 'id');
            }
        }

        $.remove(this.#outerContainer);
        $.removeEvent(this.node, 'focus.ui.switch');
        $.removeEvent(this.node, 'change.ui.switch');

        if (this.#form) {
            $.removeEvent(this.#form, 'reset.ui.switch', this.#resetHandler);
        }

        if (this.#hidden) {
            $.addClass(this.node, this.constructor.classes.hide);
        } else {
            $.removeClass(this.node, this.constructor.classes.hide);
        }

        if (this.#ariaHidden === null) {
            $.removeAttribute(this.node, 'aria-hidden');
        } else {
            $.setAttribute(this.node, { 'aria-hidden': this.#ariaHidden });
        }

        if (this.#tabIndex === null) {
            $.removeAttribute(this.node, 'tabindex');
        } else {
            $.setAttribute(this.node, { tabindex: this.#tabIndex });
        }

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
        $.removeAttribute(this.node, 'disabled');
        this.#refreshDisabled();
    }

    /**
     * Gets the current checkbox state. Animated state changes are committed when the transition finishes.
     * @returns {boolean} Whether the checkbox is checked.
     */
    getState() {
        return Boolean($.getProperty(this.node, 'checked'));
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
        if (this.#sliding) {
            return;
        }

        checked = Boolean(checked);
        this.#cancelAnimation();
        this.#targetState = checked;

        const animationId = this.#animationId;
        const targetX = this.#getTargetX(checked);
        const distance = Math.abs(targetX - this.#currentX);
        const duration = Number(this.options.duration);

        if (
            !this.options.animate ||
            this.#toggleWidth <= 0 ||
            !Number.isFinite(duration) ||
            duration <= 0 ||
            distance <= 0
        ) {
            this.#setPosition(targetX);
            this.#setState(checked);
            return;
        }

        const durationScale = Math.min(distance / this.#toggleWidth, 1);
        this.#animating = true;

        $.setStyle(this.#outerContainer, {
            '--ui-switch-transition-duration': `${duration}ms`,
            '--ui-switch-transition-scale': durationScale,
        });

        // Commit the current position before starting the transition.
        $.css(this.#container, 'transform');
        $.setStyle(this.#container, { transform: `translateX(${targetX}px)` });

        waitForTransition(this.#container, ['transform']).then((_) => {
            // A reset may have restored the checkbox before its deferred refresh.
            if (
                animationId !== this.#animationId ||
                !this.node ||
                [...this.#pendingResets].some(([event, resetAnimationId]) =>
                    resetAnimationId === animationId && !event.defaultPrevented,
                )
            ) {
                return;
            }

            this.#animating = false;
            this.#currentX = targetX;

            $.setStyle(this.#outerContainer, { '--ui-switch-transition-scale': '' });

            this.#setState(checked);
        });
    }

    /**
     * Cancels the active transition at its rendered position.
     */
    #cancelAnimation() {
        this.#animationId++;

        if (!this.#animating || !this.#container) {
            return;
        }

        const transform = $.css(this.#container, 'transform');
        let currentX = this.#currentX;

        if (transform && transform !== 'none') {
            const Matrix = window.DOMMatrixReadOnly || window.DOMMatrix;
            const x = new Matrix(transform).m41;

            if (Number.isFinite(x)) {
                currentX = x;
            }
        }

        this.#animating = false;

        this.#setPosition(currentX);
        $.setStyle(this.#outerContainer, { '--ui-switch-transition-scale': '' });
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

                    if (this.node && !event.defaultPrevented && animationId === this.#animationId) {
                        this.#resetState();
                    }
                }, 0);
            };

            $.addEvent(this.#form, 'reset.ui.switch', this.#resetHandler);
        }

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

            if (this.#suppressClickTimer !== null) {
                this.#clearClickSuppression();
                return;
            }

            $.focus(this.#outerContainer);
            this.toggleState();
        });

        let dragStartX = 0;
        let dragOffsetX = 0;

        const dragEvent = $.mouseDragFactory(
            (e) => {
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

                this.#dragActive = true;
                this.#sliding = false;
                dragStartX = x;
                dragOffsetX = x - this.#currentX;

                $.focus(this.#outerContainer);
            },
            (e) => {
                if (!this.node || !this.#dragActive || this.#toggleWidth <= 0) {
                    return;
                }

                const { x } = getPosition(e);

                if (!Number.isFinite(x)) {
                    return;
                }

                if (
                    !this.#sliding &&
                    Math.abs(x - dragStartX) < Switch.#DRAG_THRESHOLD
                ) {
                    return;
                }

                if (!this.#sliding) {
                    this.#sliding = true;
                    $.addClass(this.#outerContainer, this.constructor.classes.dragging);
                }

                if (e.cancelable) {
                    e.preventDefault();
                }

                const minX = this.#rtl ? 0 : -this.#toggleWidth;
                const maxX = this.#rtl ? this.#toggleWidth : 0;

                this.#currentX = $._clamp(x - dragOffsetX, minX, maxX);

                $.setStyle(this.#container, { transform: `translateX(${this.#currentX}px)` });
            },
            (_) => {
                const dragActive = this.#dragActive;
                this.#dragActive = false;

                if (!this.node) {
                    return;
                }

                if (!dragActive) {
                    this.#suppressNextClick();
                    return;
                }

                if (!this.#sliding) {
                    return;
                }

                this.#sliding = false;
                this.#suppressNextClick();

                $.removeClass(this.#outerContainer, this.constructor.classes.dragging);

                this.#animateState(Math.abs(this.#currentX) < this.#toggleWidth / 2);
            },
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
        if (checked) {
            return 0;
        }

        return this.#rtl ? this.#toggleWidth : -this.#toggleWidth;
    }

    /**
     * Measures and positions the rendered Switch for the current text direction.
     */
    #refresh() {
        const labelWidth = Number(this.options.labelWidth);

        this.#toggleWidth = Number.isFinite(labelWidth) && labelWidth > 0 ?
            labelWidth :
            Math.max(
                Number($.width(this.#onToggle)) || 0,
                Number($.width(this.#offToggle)) || 0,
            );

        if (this.#toggleWidth <= 0) {
            if (!this.#resizeObserver) {
                this.#resizeObserver = new window.ResizeObserver(() => {
                    if (this.node) {
                        this.#refresh();
                    }
                });

                this.#resizeObserver.observe(this.#outerContainer);
            }

            return;
        }

        const configuredDividerWidth = Number(this.options.dividerWidth);
        const dividerWidth = Number.isFinite(configuredDividerWidth) && configuredDividerWidth > 0 ?
            configuredDividerWidth :
            this.#toggleWidth / 2;

        const outerWidth = this.#toggleWidth + dividerWidth;
        const totalWidth = (this.#toggleWidth * 2) + dividerWidth;

        this.#rtl = $.css(this.#outerContainer, 'direction') === 'rtl';
        const startX = this.#getTargetX(this.#targetState);

        $.setStyle(this.#outerContainer, { width: `${outerWidth}px` });
        $.setStyle(this.#container, { width: `${totalWidth}px` });

        this.#setPosition(startX);

        $.setStyle(this.#onToggle, { width: `${this.#toggleWidth}px` });
        $.setStyle(this.#divider, { width: `${dividerWidth}px` });
        $.setStyle(this.#offToggle, { width: `${this.#toggleWidth}px` });

        this.#resizeObserver?.disconnect();
        this.#resizeObserver = null;
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
        this.#ariaHidden = $.getAttribute(this.node, 'aria-hidden');

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
        $.setAttribute(this.node, {
            'tabindex': -1,
            'aria-hidden': true,
        });
        $.before(this.node, this.#outerContainer);
    }

    /**
     * Restores the rendered state from the checkbox and cancels active interactions.
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
            transition: 'none',
            transform: `translateX(${x}px)`,
        });
        $.css(this.#container, 'transform');
        $.setStyle(this.#container, { transition: '' });
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
     * Suppresses the click generated after a completed mouse or touch drag.
     */
    #suppressNextClick() {
        this.#clearClickSuppression();

        this.#suppressClickTimer = window.setTimeout(
            (_) => this.#clearClickSuppression(),
            500,
        );
    }
}
