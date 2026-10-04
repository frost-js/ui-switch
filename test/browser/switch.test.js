import { expect, test } from '#test';
import { dispatchDragEvent, drag } from '../support/input/drag.js';

test.use({ reducedMotion: 'no-preference' });

test.describe('Switch', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(
                document.body,
                '<input id="switch" type="checkbox"><input id="switch2" type="checkbox">',
            );
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.Switch.init($.findOne('#switch')) },
            { name: 'QuerySet', init: () => $('#switch').switch() },
        ]) {
            test(`creates and registers a Switch (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);
                expect(await instance.evaluate((value) => value instanceof UI.Switch)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#switch', 'switch') === value)).toBe(true);
                await expect(page.locator('.switch-outer')).toHaveCount(1);
            });
        }

        for (const { tag, type } of [
            { tag: 'div' },
            { tag: 'select' },
            { tag: 'textarea' },
            { tag: 'input' },
            { tag: 'input', type: 'text' },
            { tag: 'input', type: 'radio' },
            { tag: 'input', type: 'number' },
        ]) {
            for (const { name, init } of [
                { name: 'constructor', init: () => new UI.Switch($.findOne('#invalid')) },
                { name: 'class', init: () => UI.Switch.init($.findOne('#invalid')) },
                { name: 'QuerySet', init: () => $('#invalid').switch() },
            ]) {
                const description = type ? `${type} inputs` : `${tag} elements`;

                test(`rejects ${description} without side effects (${name})`, async ({ page }) => {
                    const markup = await page.evaluate(({ tag, type }) => {
                        const typeAttribute = type ? ` type="${type}"` : '';
                        $.setHtml(document.body,
                            `<${tag} id="invalid" class="existing" tabindex="7"${typeAttribute}></${tag}>`,
                        );
                        return $.getHtml(document.body);
                    }, { tag, type });

                    await expect(page.evaluate(init)).rejects.toThrow(
                        'Switch must be created on a checkbox input element.',
                    );

                    expect(await page.evaluate(() => $.hasData('#invalid', 'switch'))).toBe(false);
                    expect(await page.evaluate(() => $.getHtml(document.body))).toBe(markup);
                });
            }
        }

        test('creates multiple Switches (QuerySet)', async ({ page }) => {
            expect(await page.evaluate(() => {
                $('input').switch();
                return ['#switch', '#switch2'].every((selector) =>
                    $.getData(selector, 'switch') instanceof UI.Switch,
                );
            })).toBe(true);

            await expect(page.locator('.switch-outer')).toHaveCount(2);
        });

        test('returns the first Switch (QuerySet)', async ({ page }) => {
            expect(await page.evaluate(() => {
                const component = $('input').switch();
                return component === $.getData('#switch', 'switch');
            })).toBe(true);
        });

        test('reuses an existing Switch', async ({ page }) => {
            expect(await page.evaluate(() => {
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
            expect(await page.evaluate(() => {
                const component = UI.Switch.init($.findOne('#switch'));
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
                animate: true,
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

        test.describe('failed initialization', () => {
            test.beforeEach(async ({ page }) => {
                await page.evaluate(() => {
                    $.setHtml(document.body,
                        '<form id="lifecycle-form"><label for="lifecycle-input">Label</label>' +
                        '<input id="lifecycle-input" tabindex="7" aria-hidden="false" aria-describedby="hint" type="checkbox"></form>',
                    );
                    window.resetCalls = 0;
                    $.addEvent('#lifecycle-form', 'reset.ui.switch', () => window.resetCalls++);
                });
            });

            test('rolls back an invalid label style', async ({ page }) => {
                await expect(page.evaluate(() =>
                    UI.Switch.init($.findOne('#lifecycle-input'), { onStyle: 123 }),
                )).rejects.toThrow();

                expect(await page.evaluate(() => $.hasData('#lifecycle-input', 'switch'))).toBe(false);
                await expect(page.locator('#lifecycle-input')).not.toHaveClass(/\bvisually-hidden\b/);
                await expect(page.locator('#lifecycle-input')).toHaveAttribute('tabindex', '7');
                await expect(page.locator('#lifecycle-input')).toHaveAttribute('aria-hidden', 'false');
                await expect(page.locator('#lifecycle-input')).toHaveAttribute('aria-describedby', 'hint');
                await expect(page.locator('#lifecycle-form > label')).not.toHaveAttribute('id');
                await expect(page.locator('#lifecycle-form > *')).toHaveCount(2);

                await page.evaluate(() => $.triggerEvent('#lifecycle-form', 'reset.ui.switch'));
                expect(await page.evaluate(() => window.resetCalls)).toBe(1);

                expect(await page.evaluate(() => {
                    const node = $.findOne('#lifecycle-input');
                    const instance = UI.Switch.init(node);
                    return $.getData(node, 'switch') === instance;
                })).toBe(true);
            });
        });
    });

    test.describe('#dispose', () => {
        test.use({ mockClock: true });

        for (const { name, dispose } of [
            { name: 'class', dispose: (instance) => instance.dispose() },
            { name: 'QuerySet', dispose: () => $('#switch').switch('dispose') },
        ]) {
            test(`removes the Switch and restores the original input (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() => {
                    $.setHtml(document.body, '<input class="existing" id="switch" tabindex="4" type="checkbox">');
                    const input = $.findOne('#switch');
                    const component = UI.Switch.init(input, { animate: false });
                    $.addClass(input, 'runtime');
                    return component;
                });
                await page.evaluate(dispose, instance);

                expect(await instance.evaluate((value) => ({
                    registered: $.hasData('#switch', 'switch'),
                    node: value.node,
                    options: value.options,
                }))).toEqual({ registered: false, node: null, options: null });
                const input = page.locator('#switch');
                await expect(input).toHaveClass('existing runtime');
                await expect(input).toHaveAttribute('tabindex', '4');
                await expect(page.locator('.switch-outer')).toHaveCount(0);
            });
        }

        test('restores existing hidden and absent tabindex state', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(
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

        for (const ariaHidden of [null, 'false', 'true']) {
            test(`restores original aria-hidden ${ariaHidden ?? 'absence'} after disposal`, async ({ page }) => {
                await page.evaluate((ariaHidden) => {
                    const input = $.findOne('#switch');
                    if (ariaHidden !== null) {
                        $.setAttribute(input, 'aria-hidden', ariaHidden);
                    }
                    UI.Switch.init(input, { animate: false });
                }, ariaHidden);

                const input = page.locator('#switch');
                await expect(input).toHaveAttribute('aria-hidden', 'true');
                await page.evaluate(() => $.getData('#switch', 'switch').dispose());

                if (ariaHidden === null) {
                    await expect(input).not.toHaveAttribute('aria-hidden');
                } else {
                    await expect(input).toHaveAttribute('aria-hidden', ariaHidden);
                }
            });
        }

        test('restores generated label IDs without removing runtime IDs', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(document.body,
                    '<label>Generated ' +
                    '<input id="switch" type="checkbox"></label>' +
                    '<label id="existing" for="switch">Existing</label>',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const labels = page.locator('label');
            await expect(labels.first()).toHaveAttribute('id', /^switch-label/);
            await expect(labels.nth(1)).toHaveAttribute('id', 'existing');

            await page.evaluate(() => {
                const input = $.findOne('#switch');
                input.labels[0].id = 'runtime-label';
                $.getData(input, 'switch').dispose();
            });
            await expect(labels.first()).toHaveAttribute('id', 'runtime-label');

            await page.evaluate(() => {
                const input = $.findOne('#switch');
                input.labels[0].removeAttribute('id');
                UI.Switch.init(input, { animate: false });
            });
            await expect(labels.first()).toHaveAttribute('id', /^switch-label/);

            await page.evaluate(() => {
                $.getData('#switch', 'switch').dispose();
            });
            await expect(labels.first()).not.toHaveAttribute('id');
            await expect(labels.nth(1)).toHaveAttribute('id', 'existing');
        });

        test('removes the Switch when the original input is removed', async ({ page }) => {
            expect(await page.evaluate(() => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, { animate: false });
                $.remove(input);
                return { node: component.node, options: component.options };
            })).toEqual({ node: null, options: null });

            await expect(page.locator('#switch')).toHaveCount(0);
            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });

        test('can initialize again after disposal', async ({ page }) => {
            expect(await page.evaluate(() => {
                const input = $.findOne('#switch');
                const first = UI.Switch.init(input, { animate: false });
                first.dispose();
                const second = UI.Switch.init(input, { animate: false });
                return { newInstance: first !== second, initialized: second instanceof UI.Switch };
            })).toEqual({ newInstance: true, initialized: true });

            await expect(page.locator('.switch-outer')).toHaveCount(1);
        });

        test('allows repeated disposal without affecting a new instance', async ({ page }) => {
            expect(await page.evaluate(() => {
                const input = $.findOne('#switch');
                const first = UI.Switch.init(input, { animate: false });
                first.dispose();
                first.dispose();

                const second = UI.Switch.init(input, { animate: false });
                first.dispose();
                return { node: first.node, options: first.options, registered: $.getData(input, 'switch') === second };
            })).toEqual({ node: null, options: null, registered: true });

            await expect(page.locator('.switch-outer')).toHaveCount(1);
            await page.locator('.switch-outer').click();
            await expect(page.locator('#switch')).toBeChecked();
        });

        test('stops native synchronization after disposal with pending mutations', async ({ page }) => {
            const outer = await page.evaluateHandle(() => {
                $.setHtml(document.body, '<fieldset id="fieldset"><input id="switch" type="checkbox"></fieldset>');
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, { animate: false });
                const outer = $.prev(input).shift();
                $.setProperty(input, { disabled: true, required: true });
                $.setAttribute(input, { 'aria-invalid': 'true' });
                component.dispose();
                $.setProperty('#fieldset', 'disabled', true);
                return outer;
            });

            await expect(page.locator('.switch-outer')).toHaveCount(0);
            expect(await outer.evaluate((node) => $.getAttribute(node, 'aria-disabled'))).toBe('false');
            expect(await outer.evaluate((node) => $.getAttribute(node, 'aria-required'))).toBe('false');
            expect(await outer.evaluate((node) => $.getAttribute(node, 'aria-invalid'))).toBeNull();
            await expect(page.locator('#switch')).toBeDisabled();
            await expect(page.locator('#switch')).toHaveAttribute('required', '');
            await expect(page.locator('#switch')).toHaveAttribute('aria-invalid', 'true');
        });

        test('disposes safely after a touch interrupts an animation', async ({ page }) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const component = await page.evaluateHandle(() => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
                return component;
            });
            await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'start', fraction: 0.1 });
            await component.evaluate((value) => value.dispose());
            await page.clock.runFor(120);

            expect(await component.evaluate((value) => value.node)).toBeNull();
            expect(errors).toEqual([]);

            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });
    });

    test.describe('#disable', () => {
        test.use({ mockClock: true });

        for (const { name, update } of [
            { name: 'class', update: (instance) => instance.disable() },
            { name: 'QuerySet', update: () => $('#switch').switch('disable') },
        ]) {
            test(`updates disabled state (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() => {
                    const input = $.findOne('#switch');
                    $.setProperty(input, 'disabled', false);
                    return UI.Switch.init(input, { animate: false });
                });
                await page.evaluate(update, instance);

                const outer = page.locator('.switch-outer');
                await expect(page.locator('#switch')).toBeDisabled();
                await expect(outer).toHaveClass(/\bswitch-disabled\b/);
                await expect(outer).toHaveAttribute('aria-disabled', 'true');
                await expect(outer).toHaveAttribute('tabindex', '-1');
            });
        }

        for (const checked of [false, true]) {
            test(`cancels an active drag from the ${checked ? 'checked' : 'unchecked'} state`, async ({ page }) => {
                await page.evaluate((checked) => {
                    const input = $.findOne('#switch');
                    $.setProperty(input, 'checked', checked);
                    UI.Switch.init(input, { animate: false, labelWidth: 80 });
                    window.disableChanges = 0;
                    $.addEvent(input, 'change.ui.switch', () => window.disableChanges++);
                }, checked);
                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'start', fraction: checked ? 0.9 : 0.1 });
                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'move', fraction: checked ? 0.4 : 0.6 });
                await page.evaluate(() => $.getData('#switch', 'switch').disable());

                const input = page.locator('#switch');
                const outer = page.locator('.switch-outer');
                await expect(input).toBeDisabled();
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(page.locator('.switch')).toHaveCSS(
                    'transform',
                    `matrix(1, 0, 0, 1, ${checked ? 0 : -80}, 0)`,
                );

                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'move', fraction: checked ? 0.1 : 0.9 });
                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'end', fraction: checked ? 0.1 : 0.9 });
                await outer.dispatchEvent('click', { button: 0 });

                await expect(input).toHaveJSProperty('checked', checked);
                await expect(outer).toHaveAttribute('aria-checked', `${checked}`);
                expect(await page.evaluate(() => window.disableChanges)).toBe(0);

                await page.evaluate(() => $.getData($.findOne('#switch'), 'switch').enable());
                await page.clock.runFor(501);
                await outer.click();

                await expect(input).toHaveJSProperty('checked', !checked);
                await expect(outer).toHaveAttribute('aria-checked', `${!checked}`);
                expect(await page.evaluate(() => window.disableChanges)).toBe(1);
            });
        }
    });

    test.describe('#enable', () => {
        for (const { name, update } of [
            { name: 'class', update: (instance) => instance.enable() },
            { name: 'QuerySet', update: () => $('#switch').switch('enable') },
        ]) {
            test(`updates disabled state (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() => {
                    const input = $.findOne('#switch');
                    $.setProperty(input, 'disabled', true);
                    return UI.Switch.init(input, { animate: false });
                });
                await page.evaluate(update, instance);

                const outer = page.locator('.switch-outer');
                await expect(page.locator('#switch')).toBeEnabled();
                await expect(outer).not.toHaveClass(/\bswitch-disabled\b/);
                await expect(outer).toHaveAttribute('aria-disabled', 'false');
                await expect(outer).toHaveAttribute('tabindex', '0');
            });
        }
    });

    test.describe('#getState', () => {
        for (const { name, getState } of [
            { name: 'class', getState: (instance) => instance.getState() },
            { name: 'QuerySet', getState: () => $('#switch').switch('getState') },
        ]) {
            test(`gets the state (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() => {
                    const input = $.findOne('#switch');
                    $.setProperty(input, 'checked', true);
                    return UI.Switch.init(input);
                });
                expect(await page.evaluate(getState, instance)).toBe(true);
            });
        }
    });

    test.describe('#setState', () => {
        for (const { name, update } of [
            { name: 'class', update: (instance) => instance.setState(true) },
            { name: 'QuerySet', update: () => $('#switch').switch('setState', true) },
        ]) {
            test(`updates the state (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() =>
                    UI.Switch.init($.findOne('#switch'), { animate: false }));
                await page.evaluate(update, instance);

                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
            });
        }

        test('normalizes the state', async ({ page }) => {
            await page.evaluate(() => {
                UI.Switch.init(
                    $.findOne('#switch'),
                    { animate: false },
                ).setState(1);
            });

            await expect(page.locator('#switch')).toBeChecked();
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
        });
    });

    test.describe('#toggleState', () => {
        for (const { name, update } of [
            { name: 'class', update: (instance) => instance.toggleState() },
            { name: 'QuerySet', update: () => $('#switch').switch('toggleState') },
        ]) {
            test(`updates the state (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(() =>
                    UI.Switch.init($.findOne('#switch'), { animate: false }));
                await page.evaluate(update, instance);

                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
            });
        }
    });

    test.describe('input attributes', () => {
        test('renders the component structure and hides the input', async ({ page }) => {
            await page.evaluate(() => {
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

        for (const focused of [false, true]) {
            test(`exposes one accessible control when initialized ${focused ? 'focused' : 'unfocused'}`, async ({ page }) => {
                await page.evaluate((focused) => {
                    $.setHtml(document.body,
                        '<button>Other control</button>' +
                        '<label for="switch">Notifications</label>' +
                        '<input id="switch" type="checkbox">',
                    );
                    const input = $.findOne('#switch');
                    const focusTarget = focused ? input : $.findOne('button');
                    focusTarget.focus();
                    UI.Switch.init(input, { animate: false });
                }, focused);

                const control = page.getByRole('switch', { name: 'Notifications' });
                await expect(control).toHaveCount(1);
                await expect(page.getByRole('checkbox')).toHaveCount(0);
                await expect(page.locator('body')).toMatchAriaSnapshot(`
                    - button "Other control"
                    - text: Notifications
                    - switch "Notifications"
                `);
                await expect(focused ? control : page.getByRole('button')).toBeFocused();

                await page.locator('label').click();
                await expect(control).toBeChecked();
                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.getByRole('checkbox')).toHaveCount(0);

                await page.evaluate(() => $.getData('#switch', 'switch').dispose());
                await expect(page.getByRole('switch')).toHaveCount(0);
                await expect(page.getByRole('checkbox', { name: 'Notifications' })).toBeChecked();
            });
        }

        test('renders checked, required, and disabled state', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(
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

        test('inherits validation ARIA attributes', async ({ page }) => {
            await page.evaluate(() => {
                $.setAttribute('#switch', {
                    'aria-describedby': 'hint',
                    'aria-errormessage': 'error',
                    'aria-invalid': 'true',
                    'aria-required': 'true',
                });
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('aria-describedby', 'hint');
            await expect(outer).toHaveAttribute('aria-errormessage', 'error');
            await expect(outer).toHaveAttribute('aria-invalid', 'true');
            await expect(outer).toHaveAttribute('aria-required', 'true');
        });

        test('renders an unlabelled input without an invalid label reference', async ({ page }) => {
            await page.evaluate(() => {
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).not.toHaveAttribute('aria-labelledby');
            await expect(outer).not.toHaveAttribute('aria-label');
        });

        test('inherits an explicit aria-label', async ({ page }) => {
            await page.evaluate(() => {
                $.setAttribute('#switch', { 'aria-label': 'Notifications' });
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            await expect(page.locator('.switch-outer')).toHaveAttribute(
                'aria-label',
                'Notifications',
            );
        });

        test('uses existing and generated explicit label IDs safely', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(
                    document.body,
                    '<label id="first-label">First</label><label>Second</label><input type="checkbox">',
                );
                const input = $.findOne('input');
                $.setProperty(input, 'id', 'switch"][data-invalid="');
                const labels = $.find('label');
                $.setProperty(labels[0], 'htmlFor', $.getProperty(input, 'id'));
                $.setProperty(labels[1], 'htmlFor', $.getProperty(input, 'id'));
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
            await page.evaluate(() => {
                $.setHtml(document.body,
                    '<span id="description">Description</span>' +
                    '<label id="label" for="switch">Label</label>' +
                    '<input id="switch" type="checkbox" aria-labelledby="description">',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            await expect(page.locator('.switch-outer')).toHaveAttribute(
                'aria-labelledby',
                'description label',
            );
        });

        test('supports a wrapping label', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(
                    document.body,
                    '<label id="wrapper">Notifications <input id="switch" type="checkbox"></label>',
                );
                UI.Switch.init($.findOne('#switch'), { animate: false });
            });

            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('aria-labelledby', 'wrapper');
            await expect(page.getByRole('switch', { name: 'Notifications' })).toHaveCount(1);
            await expect(page.getByRole('checkbox')).toHaveCount(0);
            await outer.click();
            await expect(page.locator('#switch')).toBeChecked();
            await page.locator('#wrapper').click({ position: { x: 2, y: 2 } });
            await expect(page.locator('#switch')).not.toBeChecked();
        });

        test.describe('native updates', () => {
            test.use({ mockClock: true });

            test('synchronizes native disabled changes', async ({ page }) => {
                await page.evaluate(() => UI.Switch.init($.findOne('#switch'), { animate: false }));
                const outer = page.locator('.switch-outer');

                await page.evaluate(() => $.setProperty('#switch', 'disabled', true));
                await expect(outer).toHaveClass(/\bswitch-disabled\b/);
                await expect(outer).toHaveAttribute('aria-disabled', 'true');
                await expect(outer).toHaveAttribute('tabindex', '-1');

                await page.evaluate(() => $.setProperty('#switch', 'disabled', false));
                await expect(outer).not.toHaveClass(/\bswitch-disabled\b/);
                await expect(outer).toHaveAttribute('aria-disabled', 'false');
                await expect(outer).toHaveAttribute('tabindex', '0');
                await outer.click();
                await expect(page.locator('#switch')).toBeChecked();
            });

            test('synchronizes native required changes and preserves explicit aria-required', async ({ page }) => {
                await page.evaluate(() => UI.Switch.init($.findOne('#switch'), { animate: false }));
                const outer = page.locator('.switch-outer');

                await page.evaluate(() => $.setProperty('#switch', 'required', true));
                await expect(outer).toHaveAttribute('aria-required', 'true');

                await page.evaluate(() => $.setAttribute('#switch', { 'aria-required': 'false' }));
                await expect(outer).toHaveAttribute('aria-required', 'false');

                await page.evaluate(() => $.removeAttribute('#switch', 'aria-required'));
                await expect(outer).toHaveAttribute('aria-required', 'true');

                await page.evaluate(() => $.setProperty('#switch', 'required', false));
                await expect(outer).toHaveAttribute('aria-required', 'false');
            });

            test('synchronizes nested fieldsets and respects the first legend exemption', async ({ page }) => {
                await page.evaluate(() => {
                    $.setHtml(document.body, `
                        <fieldset id="outer" disabled>
                            <legend><input id="legend-switch" type="checkbox"></legend>
                            <fieldset id="inner"><input id="switch" type="checkbox"></fieldset>
                        </fieldset>
                    `);
                    UI.Switch.init($.findOne('#legend-switch'), { animate: false });
                    UI.Switch.init($.findOne('#switch'), { animate: false });
                });
                const outer = page.locator('#inner .switch-outer');
                const legend = page.locator('legend .switch-outer');
                await expect(outer).toHaveAttribute('aria-disabled', 'true');
                await expect(legend).toHaveAttribute('aria-disabled', 'false');
                await expect(legend).toHaveAttribute('tabindex', '0');

                await page.evaluate(() => $.setProperty('#outer', 'disabled', false));
                await expect(outer).toHaveAttribute('aria-disabled', 'false');

                await page.evaluate(() => $.setProperty('#outer', 'disabled', true));
                await expect(outer).toHaveClass(/\bswitch-disabled\b/);
                await expect(outer).toHaveAttribute('aria-disabled', 'true');
                await expect(outer).toHaveAttribute('tabindex', '-1');
                await expect(legend).not.toHaveClass(/\bswitch-disabled\b/);
                await expect(legend).toHaveAttribute('aria-disabled', 'false');
                await legend.click();
                await expect(page.locator('#legend-switch')).toBeChecked();

                await page.evaluate(() => {
                    $.setProperty('#inner', 'disabled', true);
                    $.setProperty('#outer', 'disabled', false);
                });
                await expect(outer).toHaveAttribute('aria-disabled', 'true');

                await page.evaluate(() => $.setProperty('#inner', 'disabled', false));
                await expect(outer).not.toHaveClass(/\bswitch-disabled\b/);
                await expect(outer).toHaveAttribute('aria-disabled', 'false');
                await expect(outer).toHaveAttribute('tabindex', '0');
            });

            for (const { attribute, values } of [
                { attribute: 'aria-describedby', values: ['first-hint', 'second-hint'] },
                { attribute: 'aria-errormessage', values: ['first-error', 'second-error'] },
                { attribute: 'aria-invalid', values: ['true', 'false'] },
                { attribute: 'aria-required', values: ['true', 'false'] },
            ]) {
                test(`synchronizes native ${attribute} updates and removal`, async ({ page }) => {
                    await page.evaluate(() => UI.Switch.init($.findOne('#switch'), { animate: false }));
                    const outer = page.locator('.switch-outer');

                    for (const value of values) {
                        await page.evaluate(({ attribute, value }) => {
                            $.setAttribute('#switch', { [attribute]: value });
                        }, { attribute, value });
                        await expect(outer).toHaveAttribute(attribute, value);
                    }

                    await page.evaluate((attribute) => $.removeAttribute('#switch', attribute), attribute);
                    if (attribute === 'aria-required') {
                        await expect(outer).toHaveAttribute(attribute, 'false');
                    } else {
                        await expect(outer).not.toHaveAttribute(attribute);
                    }
                    await expect(page.locator('#switch')).toHaveAttribute('aria-hidden', 'true');
                });
            }

            for (const target of ['#switch', '#fieldset']) {
                test(`cancels an active drag when ${target} becomes disabled`, async ({ page }) => {
                    await page.evaluate(() => {
                        $.setHtml(document.body, '<fieldset id="fieldset"><input id="switch" type="checkbox"></fieldset>');
                        const input = $.findOne('#switch');
                        UI.Switch.init(input, { animate: false, labelWidth: 80 });
                        window.disabledChanges = 0;
                        $.addEvent(input, 'change.ui.switch', () => window.disabledChanges++);
                    });
                    await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'start', fraction: 0.1 });
                    await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'move', fraction: 0.9 });
                    const outer = page.locator('.switch-outer');
                    await expect(outer).toHaveClass(/\bswitch-dragging\b/);

                    await page.evaluate((target) => $.setProperty(target, 'disabled', true), target);
                    await expect(outer).toHaveAttribute('aria-disabled', 'true');
                    await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                    await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');

                    await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'move', fraction: 1 });
                    await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'end', fraction: 1 });
                    await expect(page.locator('#switch')).not.toBeChecked();
                    await expect(outer).toHaveAttribute('aria-checked', 'false');
                    expect(await page.evaluate(() => window.disabledChanges)).toBe(0);

                    await page.evaluate((target) => $.setProperty(target, 'disabled', false), target);
                    await page.clock.runFor(501);
                    await outer.click();
                    await expect(page.locator('#switch')).toBeChecked();
                    expect(await page.evaluate(() => window.disabledChanges)).toBe(1);
                });
            }
        });
    });

    test.describe('events', () => {
        test('updates from a native input change', async ({ page }) => {
            await page.evaluate(() => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, { animate: false });
                $.setProperty(input, 'checked', true);
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

        test('triggers namespaced change events only when state changes', async ({ page }) => {
            expect(await page.evaluate(() => {
                const input = $.findOne('#switch');
                const events = [];
                const component = UI.Switch.init(input, { animate: false });
                $.addEvent(input, 'change.ui.switch', (event) => {
                    events.push({
                        checked: $.getProperty(event.currentTarget, 'checked'),
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
    });

    test.describe('user events', () => {
        test.describe('click', () => {
            test('clicks to toggle once', async ({ page }) => {
                await page.evaluate(() => {
                    UI.Switch.init($.findOne('#switch'), { animate: false });
                });

                const outer = page.locator('.switch-outer');
                await outer.click();
                await expect(page.locator('#switch')).toBeChecked();
                await expect(outer).toHaveAttribute('aria-checked', 'true');
                await outer.click();
                await expect(page.locator('#switch')).not.toBeChecked();
            });

            for (const { name, disabled, button } of [
                { name: 'non-primary', disabled: false, button: 1 },
                { name: 'disabled', disabled: true, button: 0 },
            ]) {
                test(`ignores ${name} clicks`, async ({ page }) => {
                    await page.evaluate(({ disabled, button }) => {
                        const input = $.findOne('#switch');
                        const component = UI.Switch.init(input, { animate: false });
                        if (disabled) {
                            component.disable();
                        }
                        $.prev(input).shift().dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            button,
                            cancelable: true,
                        }));
                    }, { disabled, button });

                    await expect(page.locator('#switch')).not.toBeChecked();
                    await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
                });
            }
        });

        test.describe('keyboard', () => {
            for (const { key, checked } of [
                { key: 'Space', checked: false },
                { key: 'Enter', checked: true },
            ]) {
                test(`toggles with ${key}`, async ({ page }) => {
                    await page.evaluate((checked) => {
                        const input = $.findOne('#switch');
                        $.setProperty(input, 'checked', checked);
                        UI.Switch.init(input, { animate: false });
                    }, checked);

                    await page.locator('.switch-outer').press(key);
                    await expect(page.locator('#switch')).toBeChecked({ checked: !checked });
                    await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', `${!checked}`);
                });
            }

            for (const { name, press } of [
                { name: 'unrelated keys', press: (outer) => outer.press('ArrowLeft') },
                {
                    name: 'repeated keydown events',
                    press: (outer) => outer.evaluate((node) => node.dispatchEvent(new KeyboardEvent('keydown', {
                        bubbles: true,
                        code: 'Space',
                        repeat: true,
                    }))),
                },
            ]) {
                test(`ignores ${name}`, async ({ page }) => {
                    await page.evaluate(() => UI.Switch.init($.findOne('#switch'), { animate: false }));

                    const outer = page.locator('.switch-outer');
                    await outer.focus();
                    await press(outer);
                    await expect(page.locator('#switch')).not.toBeChecked();
                    await expect(outer).toHaveAttribute('aria-checked', 'false');
                });
            }

            test('ignores keyboard interaction while disabled', async ({ page }) => {
                await page.evaluate(() => {
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
        });

        test.describe('focus', () => {
            test('redirects input focus to the rendered Switch', async ({ page }) => {
                await page.evaluate(() => {
                    UI.Switch.init($.findOne('#switch'), { animate: false });
                    $.focus('#switch');
                });

                await expect(page.locator('.switch-outer')).toBeFocused();
            });

            test('renders logical padding and a visible focus ring', async ({ page }) => {
                await page.evaluate(() => {
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
        });

        test.describe('drag', () => {
            test('drags with the mouse in both directions', async ({ page }) => {
                await page.evaluate(() => {
                    UI.Switch.init($.findOne('#switch'), { animate: false, labelWidth: 80 });
                });

                await drag(page, '.switch-outer');
                await expect(page.locator('#switch')).toBeChecked();

                await drag(page, '.switch-outer', { from: 0.9, to: 0.1 });
                await expect(page.locator('#switch')).not.toBeChecked();
            });

            test('renders and drags correctly in RTL', async ({ page }) => {
                await page.evaluate(() => {
                    const input = $.findOne('#switch');
                    $.setAttribute(input, { dir: 'rtl' });
                    UI.Switch.init(input, { animate: false, labelWidth: 80 });
                });

                const outer = page.locator('.switch-outer');
                await expect(outer).toHaveAttribute('dir', 'rtl');
                await expect(outer).toHaveCSS('direction', 'rtl');
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 80, 0)');

                await drag(page, '.switch-outer', { from: 0.9, to: 0.1 });
                await expect(page.locator('#switch')).toBeChecked();
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
            });

            test('treats sub-threshold mouse movement as a click', async ({ page }) => {
                await page.evaluate(() => {
                    UI.Switch.init($.findOne('#switch'), { animate: false, labelWidth: 80 });
                });

                await drag(page, '.switch-outer', { from: 0.5, to: 0.51 });
                await expect(page.locator('#switch')).toBeChecked();
            });

            test('drags with touch and suppresses the generated click', async ({ page }) => {
                await page.evaluate(() => {
                    UI.Switch.init($.findOne('#switch'), { animate: false, labelWidth: 80 });
                });
                await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'start', fraction: 0.1 });
                expect(await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'move', fraction: 0.9 })).toBe(true);
                await page.evaluate(() => $.getData('#switch', 'switch').setState(true));
                await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'end', fraction: 0.9 });

                const outer = page.locator('.switch-outer');
                await outer.dispatchEvent('click', { button: 0 });
                await expect(page.locator('#switch')).toBeChecked();
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(outer).toHaveAttribute('aria-checked', 'true');
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
            });

            test.describe('touch cancellation', () => {
                test.use({ mockClock: true });

                for (const direction of ['ltr', 'rtl']) {
                    for (const checked of [false, true]) {
                        for (const distance of [0.01, 0.8]) {
                            for (const remainingTouch of [false, true]) {
                                const stage = distance === 0.01 ? 'before' : 'after';

                                test(`restores ${checked ? 'checked' : 'unchecked'} ${direction} state ${stage} the drag threshold with ${remainingTouch ? 'another touch remaining' : 'no touches remaining'}`, async ({ page }) => {
                                    await page.evaluate(({ direction, checked }) => {
                                        const input = $.findOne('#switch');
                                        $.setProperty(input, { checked });
                                        $.setAttribute(input, { dir: direction });
                                        UI.Switch.init(input, { animate: false, labelWidth: 80 });
                                        window.touchCancelChanges = 0;
                                        $.addEvent(input, 'change.ui.switch', () => window.touchCancelChanges++);
                                    }, { direction, checked });
                                    const sign = (checked ? -1 : 1) * (direction === 'rtl' ? -1 : 1);
                                    const from = sign > 0 ? 0.1 : 0.9;
                                    const to = from + (distance * sign);
                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'start', fraction: from });
                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'move', fraction: to });

                                    const outer = page.locator('.switch-outer');
                                    if (distance === 0.01) {
                                        await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                                    } else {
                                        await expect(outer).toHaveClass(/\bswitch-dragging\b/);
                                    }

                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'cancel', fraction: to, remainingTouch });
                                    await page.clock.runFor(1);

                                    const uncheckedX = direction === 'rtl' ? 80 : -80;
                                    const x = checked ? 0 : uncheckedX;
                                    await expect(page.locator('#switch')).toHaveJSProperty('checked', checked);
                                    await expect(outer).toHaveAttribute('aria-checked', `${checked}`);
                                    await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                                    await expect(outer.locator('.switch')).toHaveCSS('transform', `matrix(1, 0, 0, 1, ${x}, 0)`);
                                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(0);

                                    const destination = from + (0.8 * sign);
                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'move', fraction: destination });
                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'end', fraction: destination });
                                    await expect(page.locator('#switch')).toHaveJSProperty('checked', checked);
                                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(0);

                                    await outer.click();
                                    await expect(page.locator('#switch')).toHaveJSProperty('checked', !checked);
                                    await expect(outer).toHaveAttribute('aria-checked', `${!checked}`);
                                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(1);

                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'start', fraction: 1 - from });
                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'move', fraction: 1 - destination });
                                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'end', fraction: 1 - destination });
                                    await expect(page.locator('#switch')).toHaveJSProperty('checked', checked);
                                    await expect(outer).toHaveAttribute('aria-checked', `${checked}`);
                                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(2);
                                });
                            }
                        }
                    }
                }

                test('restores committed state after interrupting a transition before dragging', async ({ page }) => {
                    await page.evaluate(() => {
                        const input = $.findOne('#switch');
                        const component = UI.Switch.init(input, { duration: 5000, labelWidth: 80 });
                        window.touchCancelChanges = 0;
                        $.addEvent(input, 'change.ui.switch', () => window.touchCancelChanges++);
                        component.setState(true);
                    });
                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'start', fraction: 0.1 });
                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'cancel', fraction: 0.1 });
                    await page.clock.runFor(5100);

                    await expect(page.locator('#switch')).not.toBeChecked();
                    const outer = page.locator('.switch-outer');
                    await expect(outer).toHaveAttribute('aria-checked', 'false');
                    await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');
                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(0);

                    await outer.click();
                    await page.clock.runFor(5100);
                    await expect(page.locator('#switch')).toBeChecked();
                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(1);
                });

                test('preserves a state change started after the drag was reset', async ({ page }) => {
                    await page.evaluate(() => {
                        const input = $.findOne('#switch');
                        UI.Switch.init(input, { duration: 100, labelWidth: 80 });
                        window.touchCancelChanges = 0;
                        $.addEvent(input, 'change.ui.switch', () => window.touchCancelChanges++);
                    });
                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'start', fraction: 0.1 });
                    await page.evaluate(() => {
                        const component = $.getData('#switch', 'switch');
                        component.disable();
                        component.enable();
                        component.setState(true);
                    });
                    await page.evaluate(dispatchDragEvent, { pointer: 'touch', phase: 'cancel', fraction: 0.1 });
                    await page.clock.runFor(200);

                    await expect(page.locator('#switch')).toBeChecked();
                    await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
                    expect(await page.evaluate(() => window.touchCancelChanges)).toBe(1);
                });
            });

            test('rejects a drag start with a non-primary button', async ({ page }) => {
                await page.evaluate(() => {
                    UI.Switch.init($.findOne('#switch'), { animate: false, labelWidth: 80 });
                });
                const outer = page.locator('.switch-outer');
                const box = await outer.boundingBox();
                if (!box) {
                    throw new Error('Could not measure the switch control.');
                }

                const y = box.y + (box.height / 2);
                await page.mouse.move(box.x + (box.width * 0.1), y);
                await page.mouse.down({ button: 'right' });
                await page.mouse.move(box.x + (box.width * 0.9), y, { steps: 8 });
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');

                await page.mouse.up({ button: 'right' });
                await expect(page.locator('#switch')).not.toBeChecked();
                await expect(outer).toHaveAttribute('aria-checked', 'false');
            });

            test('rejects a drag start with a malformed mouse event', async ({ page }) => {
                await page.evaluate(() => {
                    const input = $.findOne('#switch');
                    UI.Switch.init(input, { animate: false, labelWidth: 80 });
                    $.prev(input).shift().dispatchEvent(new Event('mousedown', { bubbles: true, cancelable: true }));
                });
                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'move', fraction: 0.9 });
                const outer = page.locator('.switch-outer');
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');

                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'end', fraction: 0.9 });
                await expect(page.locator('#switch')).not.toBeChecked();
                await expect(outer).toHaveAttribute('aria-checked', 'false');
            });

            test('ignores movement without a valid coordinate during a drag', async ({ page }) => {
                await page.evaluate(() => UI.Switch.init($.findOne('#switch'), { animate: false, labelWidth: 80 }));
                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'start', fraction: 0.1 });
                await page.evaluate(() => window.dispatchEvent(new Event('mousemove')));

                const outer = page.locator('.switch-outer');
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');

                await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'end', fraction: 0.1 });
                await expect(page.locator('#switch')).not.toBeChecked();
                await expect(outer).toHaveAttribute('aria-checked', 'false');
            });
        });
    });

    test.describe('transitions', () => {
        test('handles rapid interrupted transitions deterministically', async ({ page }) => {
            await page.evaluate(() => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            const track = page.locator('.switch');
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate(() => new Promise(requestAnimationFrame));
            await page.evaluate(() => {
                $.getData('#switch', 'switch').setState(false);
            });
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate(() => new Promise(requestAnimationFrame));
            await page.evaluate(() => {
                $.getData('#switch', 'switch').setState(true);
            });

            await expect(page.locator('#switch')).toBeChecked();
            const outer = page.locator('.switch-outer');
            await expect(outer).toHaveAttribute('aria-checked', 'true');
            await expect(track).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 0, 0)',
            );
        });

        test('allows a second click to reverse an active transition', async ({ page }) => {
            await page.evaluate(() => {
                UI.Switch.init($.findOne('#switch'), {
                    duration: 100,
                    labelWidth: 80,
                });
            });

            const outer = page.locator('.switch-outer');
            await outer.click({ force: true });
            const track = outer.locator('.switch');
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate(() => new Promise(requestAnimationFrame));
            await outer.click({ force: true });
            await expect(page.locator('#switch')).not.toBeChecked();
            await expect(outer).toHaveAttribute('aria-checked', 'false');
        });

        test('completes when the track transition is canceled externally', async ({ page }) => {
            await page.evaluate(() => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            const track = page.locator('.switch');
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate(() => new Promise(requestAnimationFrame));
            await page.evaluate(() => {
                const input = $.findOne('#switch');
                const transition = $.child($.prev(input).shift()).shift()
                    .getAnimations()
                    .find((animation) => animation instanceof window.CSSTransition);

                if (!transition) {
                    throw new Error('Expected a CSS transition.');
                }

                transition.cancel();
                $.getData(input, 'switch').setState(false);
            });

            await expect(page.locator('#switch')).not.toBeChecked();
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
        });
    });

    test.describe('option precedence', () => {
        test('constructor options override data attributes', async ({ page }) => {
            expect(await page.evaluate(() => {
                const input = $.findOne('#switch');
                $.setDataset(input, {
                    uiAnimate: true,
                    uiLabelWidth: 40,
                    uiOnText: 'DATA',
                });
                const component = UI.Switch.init(input, {
                    animate: false,
                    labelWidth: 90,
                    onText: 'OPTION',
                });
                component.setState(true);
                return component.getState();
            })).toBe(true);

            const outer = page.locator('.switch-outer');
            await expect(outer.locator('.switch-toggle-on')).toHaveText('OPTION');
            await expect(outer.locator('.switch-toggle-on')).toHaveCSS('width', '90px');
            await expect(outer.locator('.switch-toggle-off')).toHaveCSS('width', '90px');
            await expect(page.locator('#switch')).toBeChecked();
        });
    });

    test.describe('animate option', () => {
        for (const { name, options = {}, attributes = {} } of [
            { name: 'option', options: { animate: false } },
            { name: 'data attribute', attributes: { uiAnimate: false } },
        ]) {
            test(`updates immediately when animation is disabled (${name})`, async ({ page }) => {
                expect(await page.evaluate(({ options, attributes }) => {
                    const input = $.findOne('#switch');
                    $.setDataset(input, attributes);
                    const component = UI.Switch.init(input, { labelWidth: 80, ...options });
                    component.setState(true);
                    return component.getState();
                }, { options, attributes })).toBe(true);

                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
            });
        }

        test('does not transition when reduced motion is preferred', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });

            await page.evaluate(() => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 200,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            await expect(page.locator('.switch')).toHaveCSS('transition-duration', '0s');
            await expect(page.locator('#switch')).toBeChecked();
        });

        test('does not transition the initial checked state', async ({ page }) => {
            expect(await page.evaluate(() => {
                const input = $.findOne('#switch');
                $.setProperty(input, 'checked', true);
                UI.Switch.init(input, {
                    duration: 200,
                    labelWidth: 80,
                });
                return $.child($.prev(input).shift()).shift()
                    .getAnimations()
                    .length;
            })).toBe(0);

            await expect(page.locator('#switch')).toBeChecked();
            await expect(page.locator('.switch')).toHaveCSS(
                'transform',
                'matrix(1, 0, 0, 1, 0, 0)',
            );
        });
    });

    test.describe('duration option', () => {
        for (const { name, options = {}, attributes = {}, expected } of [
            { name: 'option', options: { duration: 200 }, expected: '0.2s' },
            { name: 'data attribute', attributes: { uiDuration: 120 }, expected: '0.12s' },
        ]) {
            test(`transitions with the configured duration (${name})`, async ({ page }) => {
                expect(await page.evaluate(({ options, attributes }) => {
                    const input = $.findOne('#switch');
                    $.setDataset(input, attributes);
                    const component = UI.Switch.init(input, { labelWidth: 80, ...options });
                    component.setState(true);
                    return component.getState();
                }, { options, attributes })).toBe(false);

                const track = page.locator('.switch');
                await expect(track).toHaveCSS('transition-property', 'transform');
                await expect(track).toHaveCSS('transition-duration', expected);
                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
            });
        }

        test('shortens the transition after a partial drag', async ({ page }) => {
            await page.evaluate(() => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    duration: 1200,
                    labelWidth: 80,
                });
            });
            await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'start', fraction: 0.1 });
            await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'move', fraction: 0.6 });

            const outer = page.locator('.switch-outer');
            const track = outer.locator('.switch');
            await expect(outer).toHaveClass(/\bswitch-dragging\b/);
            await expect(track).toHaveCSS('transition-duration', '0s');

            await page.evaluate(dispatchDragEvent, { pointer: 'mouse', phase: 'end', fraction: 0.6 });
            await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
            await expect(track).toHaveCSS('transition-duration', '0.3s');
            await expect(page.locator('#switch')).toBeChecked();
        });

        for (const { name, duration } of [
            { name: 'invalid', duration: Number.NaN },
            { name: 'negative', duration: -1 },
            { name: 'zero', duration: 0 },
        ]) {
            test(`updates immediately with duration ${name}`, async ({ page }) => {
                expect(await page.evaluate((duration) => {
                    const component = UI.Switch.init($.findOne('#switch'), { duration, labelWidth: 80 });
                    component.setState(true);
                    return component.getState();
                }, duration)).toBe(true);

                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
                await expect(page.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
            });
        }
    });

    test.describe('dividerWidth and labelWidth options', () => {
        test('measures equal label widths and a half-width divider by default', async ({ page }) => {
            await page.evaluate(() => {
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
            expect(onBox).not.toBeNull();
            expect(dividerBox).not.toBeNull();
            expect(offBox).not.toBeNull();
            expect(onBox.width).toBeGreaterThan(0);
            expect(offBox.width).toBe(onBox.width);
            expect(dividerBox.width).toBe(onBox.width / 2);
        });

        test('keeps measured labels unwrapped in a constrained layout', async ({ page }) => {
            await page.evaluate(() => {
                $.setStyle(document.body, { width: '100px' });
                UI.Switch.init($.findOne('#switch'), {
                    animate: false,
                    offText: 'UNAVAILABLE',
                    onText: 'AVAILABLE',
                });
            });

            const outer = page.locator('.switch-outer');
            const on = outer.locator('.switch-toggle-on');
            const off = outer.locator('.switch-toggle-off');
            await expect(on).toHaveCSS('flex-shrink', '0');
            await expect(on).toHaveCSS('white-space', 'nowrap');
            await expect(off).toHaveCSS('flex-shrink', '0');
            await expect(off).toHaveCSS('white-space', 'nowrap');
            expect(await on.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
            expect(await off.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
        });

        for (const { name, options = {}, attributes = {}, widths } of [
            { name: 'options', options: { dividerWidth: 20, labelWidth: 80 }, widths: [100, 180, 80, 20] },
            { name: 'data attributes', attributes: { uiDividerWidth: 18, uiLabelWidth: 70 }, widths: [88, 158, 70, 18] },
        ]) {
            test(`applies explicit widths (${name})`, async ({ page }) => {
                await page.evaluate(({ options, attributes }) => {
                    const input = $.findOne('#switch');
                    $.setDataset(input, attributes);
                    UI.Switch.init(input, { animate: false, ...options });
                }, { options, attributes });

                const [outerWidth, trackWidth, labelWidth, dividerWidth] = widths;
                const outer = page.locator('.switch-outer');
                await expect(outer).toHaveCSS('width', `${outerWidth}px`);
                await expect(outer.locator('.switch')).toHaveCSS('width', `${trackWidth}px`);
                await expect(outer.locator('.switch-toggle-on')).toHaveCSS('width', `${labelWidth}px`);
                await expect(outer.locator('.switch-toggle-divider')).toHaveCSS('width', `${dividerWidth}px`);
                await expect(outer.locator('.switch-toggle-off')).toHaveCSS('width', `${labelWidth}px`);
            });
        }

        test('falls back to measured widths for invalid options', async ({ page }) => {
            await page.evaluate(() => {
                UI.Switch.init($.findOne('#switch'), {
                    animate: false,
                    dividerWidth: Number.NaN,
                    labelWidth: -20,
                });
            });

            const outer = page.locator('.switch-outer');
            const onBox = await outer.locator('.switch-toggle-on').boundingBox();
            const dividerBox = await outer.locator('.switch-toggle-divider').boundingBox();
            const offBox = await outer.locator('.switch-toggle-off').boundingBox();
            expect(onBox).not.toBeNull();
            expect(dividerBox).not.toBeNull();
            expect(offBox).not.toBeNull();
            expect(onBox.width).toBeGreaterThan(0);
            expect(offBox.width).toBe(onBox.width);
            expect(dividerBox.width).toBeGreaterThan(0);
        });
    });

    test.describe('size option', () => {
        for (const { name, options = {}, attributes = {}, size, pixels } of [
            { name: 'xs option', options: { size: 'xs' }, size: 'xs', pixels: 8 },
            { name: 'sm option', options: { size: 'sm' }, size: 'sm', pixels: 12 },
            { name: 'md option', options: { size: 'md' }, size: 'md', pixels: 16 },
            { name: 'lg option', options: { size: 'lg' }, size: 'lg', pixels: 20 },
            { name: 'xl option', options: { size: 'xl' }, size: 'xl', pixels: 24 },
            { name: 'data attribute', attributes: { uiSize: 'lg' }, size: 'lg', pixels: 20 },
        ]) {
            test(`renders the configured size (${name})`, async ({ page }) => {
                await page.evaluate(({ options, attributes }) => {
                    const input = $.findOne('#switch');
                    $.setDataset(input, attributes);
                    UI.Switch.init(input, { animate: false, ...options });
                }, { options, attributes });

                const outer = page.locator('.switch-outer');
                await expect(outer).toHaveCount(1);
                await expect(outer).toHaveClass(`switch-outer switch-${size}`);
                await expect(outer).toHaveCSS('font-size', `${pixels}px`);
                await expect(outer.locator('.switch-toggle-on')).toHaveCSS('padding-inline-start', `${pixels}px`);
            });
        }
    });

    test.describe('style and text options', () => {
        for (const { name, options = {}, attributes = {}, dividerStyle } of [
            {
                name: 'options',
                options: { dividerStyle: 'bg-warning', offStyle: 'text-bg-danger', offText: 'NO', onStyle: 'text-bg-success', onText: 'YES' },
                dividerStyle: 'bg-warning',
            },
            {
                name: 'data attributes',
                attributes: { uiDividerStyle: 'bg-info', uiOffStyle: 'text-bg-danger', uiOffText: 'NO', uiOnStyle: 'text-bg-success', uiOnText: 'YES' },
                dividerStyle: 'bg-info',
            },
        ]) {
            test(`renders custom text and styles (${name})`, async ({ page }) => {
                await page.evaluate(({ options, attributes }) => {
                    const input = $.findOne('#switch');
                    $.setDataset(input, attributes);
                    UI.Switch.init(input, { animate: false, ...options });
                }, { options, attributes });

                const outer = page.locator('.switch-outer');
                await expect(outer.locator('.switch-toggle-on')).toHaveClass('switch-toggle-on text-bg-success');
                await expect(outer.locator('.switch-toggle-on')).toHaveText('YES');
                await expect(outer.locator('.switch-toggle-divider')).toHaveClass(`switch-toggle-divider ${dividerStyle}`);
                await expect(outer.locator('.switch-toggle-off')).toHaveClass('switch-toggle-off text-bg-danger');
                await expect(outer.locator('.switch-toggle-off')).toHaveText('NO');
            });
        }
    });
});
