import { expect, test } from '#test';
import { resetPage } from '../setup/browser.js';

test.beforeEach(async ({ page }) => {
    await resetPage(page);
});

test.describe('Switch', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            $.setHTML(
                document.body,
                '<input id="switch" type="checkbox"><input id="switch2" type="checkbox">',
            );
        });
    });

    test.describe('#init', () => {
        test('creates a Switch directly', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                return UI.Switch.init(input, { animate: false }) instanceof UI.Switch;
            })).toBe(true);
        });

        test('creates a Switch through fQuery', async ({ page }) => {
            expect(await page.evaluate((_) =>
                $('#switch').switch({ animate: false }) instanceof UI.Switch)).toBe(true);
        });

        test('creates multiple Switches and returns the first instance', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const first = $('input').switch({ animate: false });
                return first === $.getData('#switch', 'switch') &&
                    ['#switch', '#switch2'].every((selector) =>
                        $.getData(selector, 'switch') instanceof UI.Switch);
            })).toBe(true);

            await expect(page.locator('.switch-outer')).toHaveCount(2);
        });

        test('reuses an existing instance and its resolved options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const first = UI.Switch.init(input, {
                    animate: false,
                    onText: 'YES',
                });
                const second = UI.Switch.init(input, { onText: 'OTHER' });
                return first === second;
            })).toBe(true);

            await expect(page.locator('.switch-toggle-on')).toHaveText('YES');
        });

        test('exposes frozen default options', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const component = UI.Switch.init(
                    $.findOne('#switch'),
                    { animate: false },
                );
                return {
                    animate: component.options.animate,
                    dividerStyle: component.options.dividerStyle,
                    dividerWidth: component.options.dividerWidth,
                    duration: component.options.duration,
                    frozen: Object.isFrozen(component.options),
                    labelWidth: component.options.labelWidth,
                    offStyle: component.options.offStyle,
                    offText: component.options.offText,
                    onStyle: component.options.onStyle,
                    onText: component.options.onText,
                    size: component.options.size,
                };
            })).toEqual({
                animate: false,
                dividerStyle: 'bg-body-tertiary',
                dividerWidth: null,
                duration: 500,
                frozen: true,
                labelWidth: null,
                offStyle: 'text-bg-secondary',
                offText: 'OFF',
                onStyle: 'text-bg-primary',
                onText: 'ON',
                size: 'md',
            });
        });

        test('resolves data attributes', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                $.setDataset(input, {
                    uiAnimate: false,
                    uiDividerStyle: 'bg-info',
                    uiDividerWidth: 18,
                    uiDuration: 120,
                    uiLabelWidth: 70,
                    uiOffStyle: 'text-bg-danger',
                    uiOffText: 'NO',
                    uiOnStyle: 'text-bg-success',
                    uiOnText: 'YES',
                    uiSize: 'lg',
                });
                const { options } = UI.Switch.init(input);
                return options;
            })).toEqual({
                animate: false,
                dividerStyle: 'bg-info',
                dividerWidth: 18,
                duration: 120,
                labelWidth: 70,
                offStyle: 'text-bg-danger',
                offText: 'NO',
                onStyle: 'text-bg-success',
                onText: 'YES',
                size: 'lg',
            });
        });

        test('constructor options override data attributes', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                $.setDataset(input, {
                    uiAnimate: true,
                    uiLabelWidth: 40,
                    uiOnText: 'DATA',
                });
                const { options } = UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 90,
                    onText: 'OPTION',
                });
                return {
                    animate: options.animate,
                    labelWidth: options.labelWidth,
                    onText: options.onText,
                };
            })).toEqual({
                animate: false,
                labelWidth: 90,
                onText: 'OPTION',
            });
        });
    });

    test.describe('rendering', () => {
        test('renders the component structure and hides the input', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const input = page.locator('#switch');
            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveClass('switch-outer switch-md');
            await expect(outer.locator(':scope > .switch')).toHaveCount(1);
            await expect(outer.locator('.switch-toggle-on')).toHaveText('ON');
            await expect(outer.locator('.switch-toggle-divider')).toHaveCount(1);
            await expect(outer.locator('.switch-toggle-off')).toHaveText('OFF');
            await expect(input).toHaveClass('visually-hidden');
            await expect(input).toHaveAttribute('tabindex', '-1');
        });

        test('measures equal label widths and a half-width divider', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    animate: false,
                    offText: 'A much longer off label',
                });
            });

            const outer = page.locator('.switch-outer');
            const onBox = await outer.locator('.switch-toggle-on').boundingBox();
            const dividerBox = await outer.locator('.switch-toggle-divider').boundingBox();
            const offBox = await outer.locator('.switch-toggle-off').boundingBox();
            expect(onBox.width).toBeGreaterThan(0);
            expect(offBox.width).toBe(onBox.width);
            expect(dividerBox.width).toBe(onBox.width / 2);
        });

        test('uses configured label and divider widths', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), {
                    animate: false,
                    dividerWidth: 20,
                    labelWidth: 80,
                });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveCSS('width', '100px');
            await expect(outer.locator('.switch')).toHaveCSS('width', '180px');
            await expect(outer.locator('.switch-toggle-on')).toHaveCSS('width', '80px');
            await expect(outer.locator('.switch-toggle-divider')).toHaveCSS('width', '20px');
            await expect(outer.locator('.switch-toggle-off')).toHaveCSS('width', '80px');
        });

        test('falls back to measured widths for invalid configured widths', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    animate: false,
                    dividerWidth: Number.NaN,
                    labelWidth: -20,
                });
                const outer = input.previousElementSibling;
                const [on, divider, off] = outer.firstElementChild.children;
                return on.getBoundingClientRect().width > 0 &&
                    on.getBoundingClientRect().width === off.getBoundingClientRect().width &&
                    divider.getBoundingClientRect().width > 0;
            })).toBe(true);
        });

        test('renders every size', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    ['xs', 'sm', 'md', 'lg', 'xl']
                        .map((size) => `<input id="${size}" type="checkbox">`)
                        .join(''),
                );
                for (const size of ['xs', 'sm', 'md', 'lg', 'xl']) {
                    UI.Switch.init($.findOne(`#${size}`), { animate: false, size });
                }
            });

            const sizes = [
                ['xs', 8],
                ['sm', 12],
                ['md', 16],
                ['lg', 20],
                ['xl', 24],
            ];
            const switches = page.locator('.switch-outer');
            await expect(switches).toHaveCount(sizes.length);
            for (const [index, [size, pixels]] of sizes.entries()) {
                const outer = switches.nth(index);
                await expect(outer).toHaveClass(`switch-outer switch-${size}`);
                await expect(outer).toHaveCSS('font-size', `${pixels}px`);
                await expect(outer.locator('.switch-toggle-on')).toHaveCSS(
                    'padding-inline-start',
                    `${pixels}px`,
                );
            }
        });

        test('renders custom text and styles', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), {
                    animate: false,
                    dividerStyle: 'bg-warning',
                    offStyle: 'text-bg-danger',
                    offText: 'NO',
                    onStyle: 'text-bg-success',
                    onText: 'YES',
                });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer.locator('.switch-toggle-on')).toHaveClass(
                'switch-toggle-on text-bg-success',
            );
            await expect(outer.locator('.switch-toggle-on')).toHaveText('YES');
            await expect(outer.locator('.switch-toggle-divider')).toHaveClass(
                'switch-toggle-divider bg-warning',
            );
            await expect(outer.locator('.switch-toggle-off')).toHaveClass(
                'switch-toggle-off text-bg-danger',
            );
            await expect(outer.locator('.switch-toggle-off')).toHaveText('NO');
        });

        test('renders checked, required, and disabled state', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<input id="switch" type="checkbox" checked required disabled>',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await expect(page.locator('#switch')).toBeChecked();
            await expect(page.locator('#switch')).toBeDisabled();
            await expect(outer).toHaveAttribute('role', 'switch');
            await expect(outer).toHaveAttribute('aria-checked', 'true');
            await expect(outer).toHaveAttribute('aria-required', 'true');
            await expect(outer).toHaveAttribute('aria-disabled', 'true');
            await expect(outer).toHaveAttribute('tabindex', '-1');
            await expect(outer).toHaveClass(/switch-disabled/);
            await expect(outer).toHaveCSS('opacity', '0.5');
            await expect(outer).toHaveCSS('pointer-events', 'none');
        });

        test('renders an unlabelled input without an invalid label reference', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).not.toHaveAttribute('aria-labelledby');
            await expect(outer).not.toHaveAttribute('aria-label');
        });

        test('inherits an explicit aria-label', async ({ page }) => {
            await page.evaluate((_) => {
                $.setAttribute('#switch', { 'aria-label': 'Notifications' });
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            await expect(page.locator('.switch-outer')).toHaveAttribute(
                'aria-label',
                'Notifications',
            );
        });

        test('uses existing and generated explicit label IDs safely', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<label id="first-label">First</label><label>Second</label><input type="checkbox">',
                );
                const input = $.findOne('input');
                input.id = 'switch"][data-invalid="';
                const labels = $.find('label');
                labels[0].htmlFor = input.id;
                labels[1].htmlFor = input.id;
                UI.Switch.init(input, { animate: false });
            });

            await expect(page.locator('label').nth(1)).toHaveAttribute(
                'id',
                /^switch-label/,
            );
            await expect(page.locator('.switch-outer')).toHaveAttribute(
                'aria-labelledby',
                /^first-label switch-label/,
            );
        });

        test('combines input and associated label references', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<span id="description">Description</span><label id="label" for="switch">Label</label><input id="switch" type="checkbox" aria-labelledby="description">',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            await expect(page.locator('.switch-outer')).toHaveAttribute(
                'aria-labelledby',
                'description label',
            );
        });

        test('supports a wrapping label', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<label id="wrapper">Notifications <input id="switch" type="checkbox"></label>',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('aria-labelledby', 'wrapper');
            await outer.click();
            await expect(page.locator('#switch')).toBeChecked();
            await page.locator('#wrapper').click({ position: { x: 2, y: 2 } });
            await expect(page.locator('#switch')).not.toBeChecked();
        });
    });

    test.describe('public methods', () => {
        test('gets, sets, normalizes, and toggles state', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const component = UI.Switch.init(
                    $.findOne('#switch'),
                    { animate: false },
                );
                return component.getState();
            })).toBe(false);

            await page.evaluate((_) => {
                $.getData('#switch', 'switch').setState(1);
            });
            await expect(page.locator('#switch')).toBeChecked();
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
            expect(await page.evaluate((_) =>
                $.getData('#switch', 'switch').getState())).toBe(true);

            await page.evaluate((_) => {
                $.getData('#switch', 'switch').toggleState();
            });
            await expect(page.locator('#switch')).not.toBeChecked();
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
            expect(await page.evaluate((_) =>
                $.getData('#switch', 'switch').getState())).toBe(false);
        });

        test('dispatches state methods through fQuery', async ({ page }) => {
            await page.evaluate((_) => {
                $('#switch').switch({ animate: false });
                $('#switch').switch('setState', true);
            });

            await expect(page.locator('#switch')).toBeChecked();
            expect(await page.evaluate((_) => $('#switch').switch('getState'))).toBe(true);

            await page.evaluate((_) => {
                $('#switch').switch('toggleState');
            });
            await expect(page.locator('#switch')).not.toBeChecked();
            expect(await page.evaluate((_) => $('#switch').switch('getState'))).toBe(false);
        });

        test('disables and enables directly', async ({ page }) => {
            await page.evaluate((_) => {
                const component = UI.Switch.init(
                    $.findOne('#switch'),
                    { animate: false },
                );
                component.disable();
            });

            const input = page.locator('#switch');
            const outer = page.locator('.switch-outer');
            await expect(input).toBeDisabled();
            await expect(outer).toHaveClass(/switch-disabled/);
            await expect(outer).toHaveAttribute('tabindex', '-1');

            await page.evaluate((_) => {
                $.getData('#switch', 'switch').enable();
            });
            await expect(input).toBeEnabled();
            await expect(outer).not.toHaveClass(/switch-disabled/);
            await expect(outer).toHaveAttribute('tabindex', '0');
        });

        test('dispatches enable and disable through fQuery', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('#switch').switch({ animate: false });
                $('#switch').switch('disable');
                const disabled = $.is('#switch', ':disabled');
                $('#switch').switch('enable');
                return disabled && !$.is('#switch', ':disabled');
            })).toBe(true);
        });
    });

    test.describe('events and interaction', () => {
        test('clicks to toggle once', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await outer.click();
            await expect(page.locator('#switch')).toBeChecked();
            await expect(outer).toHaveAttribute('aria-checked', 'true');
            await outer.click();
            await expect(page.locator('#switch')).not.toBeChecked();
        });

        test('ignores non-primary and disabled clicks', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, { animate: false });
                const outer = input.previousElementSibling;
                outer.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    button: 1,
                    cancelable: true,
                }));
            });
            await expect(page.locator('#switch')).not.toBeChecked();

            await page.evaluate((_) => {
                const component = $.getData('#switch', 'switch');
                const outer = component.node.previousElementSibling;
                component.disable();
                outer.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    button: 0,
                    cancelable: true,
                }));
            });
            await expect(page.locator('#switch')).not.toBeChecked();
        });

        test('toggles with Space and Enter but ignores repeat and unrelated keys', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await outer.focus();
            await outer.press('ArrowLeft');
            await expect(page.locator('#switch')).not.toBeChecked();
            await page.evaluate((_) => {
                $.findOne('.switch-outer').dispatchEvent(new KeyboardEvent('keydown', {
                    bubbles: true,
                    code: 'Space',
                    repeat: true,
                }));
            });
            await expect(page.locator('#switch')).not.toBeChecked();
            await outer.press('Space');
            await expect(page.locator('#switch')).toBeChecked();
            await outer.press('Enter');
            await expect(page.locator('#switch')).not.toBeChecked();
        });

        test('ignores keyboard interaction while disabled', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init(
                    $.findOne('#switch'),
                    { animate: false },
                ).disable();
                $.findOne('.switch-outer').dispatchEvent(new KeyboardEvent('keydown', {
                    bubbles: true,
                    code: 'Space',
                }));
            });

            await expect(page.locator('#switch')).not.toBeChecked();
        });

        test('redirects input focus to the rendered Switch', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
                $.focus('#switch');
            });

            await expect(page.locator('.switch-outer')).toBeFocused();
        });

        test('updates from a native input change', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, { animate: false });
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });

            await expect(page.locator('#switch')).toBeChecked();
            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('aria-checked', 'true');
            await expect(outer.locator('.switch')).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 0, 0)',
            );
        });

        test('emits namespaced change events only when state changes', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const events = [];
                const component = UI.Switch.init(input, { animate: false });
                $.addEvent(input, 'change.ui.switch', (event) => {
                    events.push({
                        checked: event.currentTarget.checked,
                        namespace: event.namespace,
                        skipUpdate: event.skipUpdate,
                        type: event.type,
                    });
                });
                component.setState(true);
                component.setState(true);
                component.setState(false);
                return events;
            })).toEqual([
                {
                    checked: true,
                    namespace: 'ui.switch',
                    skipUpdate: true,
                    type: 'change',
                },
                {
                    checked: false,
                    namespace: 'ui.switch',
                    skipUpdate: true,
                    type: 'change',
                },
            ]);
        });

        test('drags with the mouse in both directions', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 80,
                });
                const outer = input.previousElementSibling;
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
                window.dispatchEvent(new MouseEvent('mouseup'));
            });

            await expect(page.locator('#switch')).toBeChecked();

            await page.evaluate((_) => {
                const outer = $.findOne('.switch-outer');
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }));
                window.dispatchEvent(new MouseEvent('mouseup'));
            });
            await expect(page.locator('#switch')).not.toBeChecked();
        });

        test('treats sub-threshold mouse movement as a click', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 80,
                });
                const outer = input.previousElementSibling;
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 401 }));
                window.dispatchEvent(new MouseEvent('mouseup'));
                outer.click();
            });
            await expect(page.locator('#switch')).toBeChecked();
        });

        test('drags with touch and suppresses the generated click', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 80,
                });
                const outer = input.previousElementSibling;
                const rect = outer.getBoundingClientRect();
                const y = rect.top + (rect.height / 2);
                const dispatchTouch = (target, type, x, active) => {
                    const event = new Event(type, {
                        bubbles: true,
                        cancelable: true,
                    });
                    Object.defineProperty(event, 'touches', {
                        value: active ? [{ pageX: x, pageY: y }] : [],
                    });
                    target.dispatchEvent(event);
                };

                dispatchTouch(outer, 'touchstart', rect.left + 10, true);
                dispatchTouch(window, 'touchmove', rect.right + 40, true);
                $.getData(input, 'switch').setState(true);
                dispatchTouch(window, 'touchend', rect.right + 40, false);
                outer.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    button: 0,
                    cancelable: true,
                }));
            });

            await expect(page.locator('#switch')).toBeChecked();
            const outer = page.locator('.switch-outer');
            await expect(outer).not.toHaveAttribute('data-ui-animating');
            await expect(outer).not.toHaveAttribute('data-ui-sliding');
        });

        test('rejects invalid drag starts', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, { animate: false });
                const outer = input.previousElementSibling;
                outer.dispatchEvent(new MouseEvent('mousedown', {
                    bubbles: true,
                    button: 1,
                }));
                outer.dispatchEvent(new Event('mousedown', {
                    bubbles: true,
                    cancelable: true,
                }));
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new Event('mousemove'));
                window.dispatchEvent(new MouseEvent('mouseup'));
                return input.checked;
            })).toBe(false);
        });
    });

    test.describe('animation', () => {
        test('updates immediately when animation is disabled', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            await expect(page.locator('#switch')).toBeChecked();
            await expect(page.locator('.switch')).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 0, 0)',
            );
        });

        test('animates state changes', async ({ page }) => {
            await page.evaluate((_) => {
                const component = UI.Switch.init($.findOne('#switch'), {
                    duration: 80,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            await expect(page.locator('#switch')).toBeChecked();
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
        });

        test('shortens animation after a partial drag', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    duration: 120,
                    labelWidth: 80,
                });
                const outer = input.previousElementSibling;
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 460 }));
                window.dispatchEvent(new MouseEvent('mouseup'));
            });

            await expect(page.locator('#switch')).toBeChecked();
        });

        test('handles rapid interrupted animation deterministically', async ({ page }) => {
            await page.evaluate(async (_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
                await new Promise((resolve) => setTimeout(resolve, 20));
                component.setState(false);
                await new Promise((resolve) => setTimeout(resolve, 20));
                component.setState(true);
                await new Promise((resolve) => setTimeout(resolve, 160));
            });

            await expect(page.locator('#switch')).toBeChecked();
            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('aria-checked', 'true');
            await expect(outer.locator('.switch')).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 0, 0)',
            );
        });

        test('allows a second click to reverse an active animation', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), {
                    duration: 100,
                    labelWidth: 80,
                });
            });

            const outer = page.locator('.switch-outer');
            await outer.click({ force: true });
            await page.waitForTimeout(20);
            await outer.click({ force: true });
            await page.waitForTimeout(140);
            await expect(page.locator('#switch')).not.toBeChecked();
            await expect(outer).toHaveAttribute('aria-checked', 'false');
        });

        test('recovers when the track animation is stopped externally', async ({ page }) => {
            expect(await page.evaluate(async (_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
                await new Promise((resolve) => setTimeout(resolve, 20));
                $.stop(input.previousElementSibling.firstElementChild, { finish: false });
                await Promise.resolve();
                component.setState(false);
                await new Promise((resolve) => setTimeout(resolve, 120));
                return component.getState();
            })).toBe(false);
        });

        test('guards zero width and invalid durations', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<div hidden><input id="zero" type="checkbox"></div><input id="invalid" type="checkbox"><input id="negative" type="checkbox">',
                );
                const zeroInput = $.findOne('#zero');
                const zero = UI.Switch.init(zeroInput, { duration: 100 });
                zero.setState(true);
                const zeroOuter = zeroInput.previousElementSibling;
                zeroOuter.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
                window.dispatchEvent(new MouseEvent('mouseup'));
                const invalidInput = $.findOne('#invalid');
                const invalid = UI.Switch.init(invalidInput, {
                    duration: Number.NaN,
                    labelWidth: 80,
                });
                invalid.setState(true);
                const negativeInput = $.findOne('#negative');
                const negative = UI.Switch.init(negativeInput, {
                    duration: -1,
                    labelWidth: 80,
                });
                negative.setState(true);
            });

            await expect(page.locator('#zero')).toBeChecked();
            await expect(page.locator('#invalid')).toBeChecked();
            await expect(page.locator('#negative')).toBeChecked();
            await expect(page.locator('.switch').first()).toHaveAttribute(
                'style',
                /transform: translateX\(0px\)/,
            );
            await expect(page.locator('.switch').first()).not.toHaveAttribute('style', /NaN/);
        });
    });

    test.describe('styles, direction, and layout', () => {
        test('renders logical padding and a visible focus ring', async ({ page }) => {
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            await page.keyboard.press('Tab');
            const outer = page.locator('.switch-outer');
            await expect(outer).toBeFocused();
            await expect(outer).not.toHaveCSS('box-shadow', 'none');
            const on = outer.locator('.switch-toggle-on');
            await expect(on).toHaveCSS('padding-inline-start', '16px');
            await expect(on).toHaveCSS('padding-inline-end', '16px');
            await expect(on).toHaveCSS('padding-block-start', '4px');
            await expect(on).toHaveCSS('padding-block-end', '4px');
        });

        test('renders and drags correctly in RTL', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                $.setAttribute(input, { dir: 'rtl' });
                UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 80,
                });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('dir', 'rtl');
            await expect(outer).toHaveCSS('direction', 'rtl');
            await expect(outer.locator('.switch')).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 80, 0)',
            );
            await page.evaluate((_) => {
                const outer = $.findOne('.switch-outer');
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }));
                window.dispatchEvent(new MouseEvent('mouseup'));
            });
            await expect(page.locator('#switch')).toBeChecked();
            await expect(outer.locator('.switch')).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 0, 0)',
            );
        });

        test('handles hidden layout without NaN styles', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<div hidden><input id="switch" type="checkbox" checked></div>',
                );
                UI.Switch.init($.findOne('#switch'));
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveCSS('width', '0px');
            await expect(outer.locator('.switch')).toHaveCSS('width', '0px');
            await expect(outer.locator('.switch')).toHaveAttribute(
                'style',
                /transform: translateX\(0px\)/,
            );
            await expect(outer.locator('.switch')).not.toHaveAttribute('style', /NaN/);
        });
    });

    test.describe('#dispose', () => {
        test('removes the Switch and restores the original input', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<input class="existing" id="switch" tabindex="4" type="checkbox">',
                );
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, { animate: false });
                $.addClass(input, 'runtime');
                component.dispose();
                return !$.hasData(input, 'switch') &&
                    component.node === null &&
                    component.options === null;
            })).toBe(true);

            const input = page.locator('#switch');
            await expect(input).toHaveClass('existing runtime');
            await expect(input).toHaveAttribute('tabindex', '4');
            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });

        test('restores existing hidden and absent tabindex state', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<input class="visually-hidden existing" id="switch" type="checkbox">',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false }).dispose();
            });

            const input = page.locator('#switch');
            await expect(input).toHaveClass('visually-hidden existing');
            await expect(input).not.toHaveAttribute('tabindex');
            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });

        test('restores generated label IDs without removing runtime IDs', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHTML(
                    document.body,
                    '<label>Generated <input id="switch" type="checkbox"></label><label id="existing" for="switch">Existing</label>',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const labels = page.locator('label');
            await expect(labels.first()).toHaveAttribute('id', /^switch-label/);
            await expect(labels.nth(1)).toHaveAttribute('id', 'existing');

            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                input.labels[0].id = 'runtime-label';
                $.getData(input, 'switch').dispose();
            });
            await expect(labels.first()).toHaveAttribute('id', 'runtime-label');

            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                input.labels[0].removeAttribute('id');
                UI.Switch.init(input, { animate: false });
            });
            await expect(labels.first()).toHaveAttribute('id', /^switch-label/);

            await page.evaluate((_) => {
                $.getData('#switch', 'switch').dispose();
            });
            await expect(labels.first()).not.toHaveAttribute('id');
            await expect(labels.nth(1)).toHaveAttribute('id', 'existing');
        });

        test('disposes through fQuery', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('#switch').switch({ animate: false });
                $('#switch').switch('dispose');
                return $.hasData('#switch', 'switch');
            })).toBe(false);

            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });

        test('disposes when the original input is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, { animate: false });
                $.remove(input);
                return component.node === null && component.options === null;
            })).toBe(true);

            await expect(page.locator('#switch')).toHaveCount(0);
            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });

        test('can reinitialize after disposal', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const first = UI.Switch.init(input, { animate: false });
                first.dispose();
                const second = UI.Switch.init(input, { animate: false });
                return first !== second && second instanceof UI.Switch;
            })).toBe(true);

            await expect(page.locator('.switch-outer')).toHaveCount(1);
        });

        test('cancels active animation and click suppression during disposal', async ({ page }) => {
            expect(await page.evaluate(async (_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                const outer = input.previousElementSibling;
                component.setState(true);

                const event = new Event('touchstart', {
                    bubbles: true,
                    cancelable: true,
                });
                Object.defineProperty(event, 'touches', {
                    value: [{ pageX: 10, pageY: 10 }],
                });
                outer.dispatchEvent(event);
                component.dispose();
                await new Promise((resolve) => setTimeout(resolve, 120));
                return component.node;
            })).toBeNull();

            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });
    });
});
