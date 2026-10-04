/** @import { Page } from '@playwright/test'; */
/**
 * Drags between horizontal positions within a switch control.
 * @param {Page} page The test page.
 * @param {string} selector The switch control selector.
 * @param {object} [options] The drag position options.
 * @param {number} [options.from=0.1] The starting position as a fraction of the control.
 * @param {number} [options.to=0.9] The ending position as a fraction of the control.
 */
export async function drag(page, selector, { from = 0.1, to = 0.9 } = {}) {
    const box = await page.locator(selector).boundingBox();

    if (!box) {
        throw new Error('Could not measure the switch control.');
    }

    const y = box.y + (box.height / 2);
    await page.mouse.move(box.x + (box.width * from), y);
    await page.mouse.down();
    await page.mouse.move(box.x + (box.width * to), y, { steps: 8 });
    await page.mouse.up();
}

/**
 * Dispatches a synthetic mouse or touch drag event on the switch control.
 * @param {object} options The drag event options.
 * @param {'mouse'|'touch'} options.pointer The input type.
 * @param {'start'|'move'|'end'|'cancel'} options.phase The drag phase. Cancellation applies to touch input.
 * @param {number} options.fraction The horizontal position as a fraction of the control.
 * @param {boolean} [options.remainingTouch=false] Whether another touch remains after cancellation.
 * @returns {boolean} Whether the event's default action was prevented.
 */
export function dispatchDragEvent({ pointer, phase, fraction, remainingTouch = false }) {
    const outer = $.findOne('.switch-outer');
    const rect = $.rect(outer);
    const x = rect.left + (rect.width * fraction);
    const y = rect.top + (rect.height / 2);
    const target = phase === 'start' ? outer : window;

    if (pointer === 'mouse') {
        const type = { start: 'mousedown', move: 'mousemove', end: 'mouseup' }[phase];
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
        target.dispatchEvent(event);
        return event.defaultPrevented;
    }

    const type = { start: 'touchstart', move: 'touchmove', end: 'touchend', cancel: 'touchcancel' }[phase];
    const event = new Event(type, { bubbles: true, cancelable: true });
    const touch = { identifier: 1, target: outer, pageX: x, pageY: y };
    let touches = phase === 'end' || phase === 'cancel' ? [] : [touch];
    if (phase === 'cancel' && remainingTouch) {
        touches = [{ ...touch, identifier: 2 }];
    }
    Object.defineProperty(event, 'touches', { value: touches });
    Object.defineProperty(event, 'changedTouches', { value: [touch] });
    target.dispatchEvent(event);
    return event.defaultPrevented;
}
