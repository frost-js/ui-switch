/** @import { Page } from '@playwright/test'; */

/**
 * Resets the browser page and Switch configuration.
 * @param {Page} page The Playwright page.
 * @returns {Promise<void>} The promise.
 */
export async function resetPage(page) {
    await page.goto('/', {
        waitUntil: 'domcontentloaded',
    });

    const stateReset = await page.evaluate((_) => {
        if (!window.fQuery || !window.UI?.Switch) {
            return false;
        }

        window.$ = window.fQuery;

        UI.Switch.defaults.size = 'md';
        UI.Switch.defaults.onStyle = 'text-bg-primary';
        UI.Switch.defaults.offStyle = 'text-bg-secondary';
        UI.Switch.defaults.dividerStyle = 'bg-body-tertiary';
        UI.Switch.defaults.onText = 'ON';
        UI.Switch.defaults.offText = 'OFF';
        UI.Switch.defaults.labelWidth = null;
        UI.Switch.defaults.dividerWidth = null;
        UI.Switch.defaults.animate = true;
        UI.Switch.defaults.duration = 500;

        UI.Switch.classes.disabled = 'switch-disabled';
        UI.Switch.classes.hide = 'visually-hidden';
        UI.Switch.classes.outer = 'switch-outer';
        UI.Switch.classes.switch = 'switch';
        UI.Switch.classes.toggleDivider = 'switch-toggle-divider';
        UI.Switch.classes.toggleOff = 'switch-toggle-off';
        UI.Switch.classes.toggleOn = 'switch-toggle-on';

        $.empty(document.body);

        return window.$ === window.fQuery &&
            typeof $.QuerySet.prototype.switch === 'function';
    });

    if (!stateReset) {
        throw new Error('Failed to restore Switch on the test page.');
    }

    await page.waitForFunction((_) => {
        const outer = $.create('div', { class: 'switch-outer' });
        const track = $.create('div', { class: 'switch' });
        const toggle = $.create('div', { class: 'switch-toggle-on' });
        $.append(track, toggle);
        $.append(outer, track);
        $.append(document.body, outer);
        const ready = $.css(outer, 'overflow') === 'hidden' &&
            $.css(track, 'display') === 'flex' &&
            $.css(toggle, 'padding-inline-start') === '16px';
        $.remove(outer);
        return ready;
    });
}
