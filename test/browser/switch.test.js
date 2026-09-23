import { expect, test } from '#test';

test.use({ reducedMotion: 'no-preference' });

test.describe('Switch', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            $.setHtml(
                document.body,
                '<input id="switch" type="checkbox"><input id="switch2" type="checkbox">',
            );
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.Switch.init(document.querySelector('#switch')) },
            { name: 'QuerySet', init: () => $('#switch').switch() },
        ]) {
            test(`creates a Switch (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);
                expect(await instance.evaluate((value) => value instanceof UI.Switch)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#switch', 'switch') === value)).toBe(true);
                await expect(page.locator('.switch-outer')).toHaveCount(1);
            });
        }

        test('creates multiple Switches (QuerySet)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                $('input').switch();
                return ['#switch', '#switch2'].every((selector) =>
                    $.getData(selector, 'switch') instanceof UI.Switch,
                );
            })).toBe(true);

            await expect(page.locator('.switch-outer')).toHaveCount(2);
        });

        test('returns the first Switch (QuerySet)', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const component = $('input').switch();
                return component === $.getData('#switch', 'switch');
            })).toBe(true);
        });

        test('reuses an existing Switch', async ({ page }) => {
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
    });

    test.describe('#dispose', () => {
        test.use({ mockClock: true });

        for (const { name, dispose } of [
            { name: 'class', dispose: (instance) => instance.dispose() },
            { name: 'QuerySet', dispose: () => $('#switch').switch('dispose') },
        ]) {
            test(`removes the Switch and restores the original input (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle((_) => {
                    document.body.innerHTML = '<input class="existing" id="switch" tabindex="4" type="checkbox">';
                    const input = document.querySelector('#switch');
                    const component = UI.Switch.init(input, { animate: false });
                    input.classList.add('runtime');
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
            await page.evaluate((_) => {
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

        test('restores generated label IDs without removing runtime IDs', async ({ page }) => {
            await page.evaluate((_) => {
                $.setHtml(
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

        test('removes the Switch when the original input is removed', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, { animate: false });
                $.remove(input);
                return component.node === null && component.options === null;
            })).toBe(true);

            await expect(page.locator('#switch')).toHaveCount(0);
            await expect(page.locator('.switch-outer')).toHaveCount(0);
        });

        test('can initialize again after disposal', async ({ page }) => {
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const first = UI.Switch.init(input, { animate: false });
                first.dispose();
                const second = UI.Switch.init(input, { animate: false });
                return first !== second && second instanceof UI.Switch;
            })).toBe(true);

            await expect(page.locator('.switch-outer')).toHaveCount(1);
        });

        test('disposes safely after a touch interrupts an animation', async ({ page }) => {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const component = await page.evaluateHandle((_) => {
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
                return component;
            });
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
                const instance = await page.evaluateHandle((_) => {
                    const input = document.querySelector('#switch');
                    input.disabled = false;
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
                    input.checked = checked;
                    const component = UI.Switch.init(input, { animate: false, labelWidth: 80 });
                    const outer = input.previousElementSibling;

                    window.disableChanges = 0;
                    $.addEvent(input, 'change.ui.switch', (_) => window.disableChanges++);

                    outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                    window.dispatchEvent(new MouseEvent('mousemove', { clientX: checked ? 340 : 460 }));
                    component.disable();
                }, checked);

                const input = page.locator('#switch');
                const outer = page.locator('.switch-outer');
                await expect(input).toBeDisabled();
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(page.locator('.switch')).toHaveCSS(
                    'transform',
                    `matrix(1, 0, 0, 1, ${checked ? 0 : -80}, 0)`,
                );

                await page.evaluate((checked) => {
                    window.dispatchEvent(new MouseEvent('mousemove', { clientX: checked ? 300 : 500 }));
                    window.dispatchEvent(new MouseEvent('mouseup'));
                    $.findOne('.switch-outer').click();
                }, checked);

                await expect(input).toHaveJSProperty('checked', checked);
                await expect(outer).toHaveAttribute('aria-checked', `${checked}`);
                expect(await page.evaluate((_) => window.disableChanges)).toBe(0);

                await page.evaluate((_) => $.getData($.findOne('#switch'), 'switch').enable());
                await page.clock.runFor(501);
                await outer.click();

                await expect(input).toHaveJSProperty('checked', !checked);
                await expect(outer).toHaveAttribute('aria-checked', `${!checked}`);
                expect(await page.evaluate((_) => window.disableChanges)).toBe(1);
            });
        }
    });

    test.describe('#enable', () => {
        for (const { name, update } of [
            { name: 'class', update: (instance) => instance.enable() },
            { name: 'QuerySet', update: () => $('#switch').switch('enable') },
        ]) {
            test(`updates disabled state (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle((_) => {
                    const input = document.querySelector('#switch');
                    input.disabled = true;
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
                const instance = await page.evaluateHandle((_) => {
                    const input = document.querySelector('#switch');
                    input.checked = true;
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
                const instance = await page.evaluateHandle((_) =>
                    UI.Switch.init(document.querySelector('#switch'), { animate: false }));
                await page.evaluate(update, instance);

                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
            });
        }

        test('normalizes the state', async ({ page }) => {
            await page.evaluate((_) => {
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
                const instance = await page.evaluateHandle((_) =>
                    UI.Switch.init(document.querySelector('#switch'), { animate: false }));
                await page.evaluate(update, instance);

                await expect(page.locator('#switch')).toBeChecked();
                await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
            });
        }
    });

    test.describe('input attributes', () => {
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

        test('renders checked, required, and disabled state', async ({ page }) => {
            await page.evaluate((_) => {
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
                $.setHtml(
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
                $.setHtml(
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
                $.setHtml(
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

    test.describe('events', () => {
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

        test('triggers namespaced change events only when state changes', async ({ page }) => {
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
    });

    test.describe('user events', () => {
        test.describe('click', () => {
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

            for (const { name, disabled, button } of [
                { name: 'non-primary', disabled: false, button: 1 },
                { name: 'disabled', disabled: true, button: 0 },
            ]) {
                test(`ignores ${name} clicks`, async ({ page }) => {
                    await page.evaluate(({ disabled, button }) => {
                        const input = document.querySelector('#switch');
                        const component = UI.Switch.init(input, { animate: false });
                        if (disabled) {
                            component.disable();
                        }
                        input.previousElementSibling.dispatchEvent(new MouseEvent('click', {
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
                        const input = document.querySelector('#switch');
                        input.checked = checked;
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
                    await page.evaluate((_) => UI.Switch.init(document.querySelector('#switch'), { animate: false }));

                    const outer = page.locator('.switch-outer');
                    await outer.focus();
                    await press(outer);
                    await expect(page.locator('#switch')).not.toBeChecked();
                    await expect(outer).toHaveAttribute('aria-checked', 'false');
                });
            }

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
        });

        test.describe('focus', () => {
            test('redirects input focus to the rendered Switch', async ({ page }) => {
                await page.evaluate((_) => {
                    UI.Switch.init($.findOne('#switch'), { animate: false });
                    $.focus('#switch');
                });

                await expect(page.locator('.switch-outer')).toBeFocused();
            });

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
        });

        test.describe('drag', () => {
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
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(outer).toHaveAttribute('aria-checked', 'true');
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
            });

            for (const { name, start } of [
                {
                    name: 'non-primary button',
                    start: (outer) => outer.dispatchEvent(new MouseEvent('mousedown', {
                        bubbles: true,
                        button: 1,
                        clientX: 400,
                    })),
                },
                {
                    name: 'malformed mouse event',
                    start: (outer) => outer.dispatchEvent(new Event('mousedown', {
                        bubbles: true,
                        cancelable: true,
                    })),
                },
            ]) {
                test(`rejects a drag start with a ${name}`, async ({ page }) => {
                    const outer = await page.evaluateHandle((_) => {
                        const input = document.querySelector('#switch');
                        UI.Switch.init(input, { animate: false, labelWidth: 80 });
                        return input.previousElementSibling;
                    });
                    await page.evaluate(start, outer);
                    await page.evaluate((_) => {
                        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
                    });

                    const rendered = page.locator('.switch-outer');
                    await expect(rendered).not.toHaveClass(/\bswitch-dragging\b/);
                    await expect(rendered.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');

                    await page.evaluate((_) => window.dispatchEvent(new MouseEvent('mouseup')));
                    await expect(page.locator('#switch')).not.toBeChecked();
                    await expect(rendered).toHaveAttribute('aria-checked', 'false');
                });
            }

            test('ignores movement without a valid coordinate during a drag', async ({ page }) => {
                await page.evaluate((_) => {
                    const input = document.querySelector('#switch');
                    UI.Switch.init(input, { animate: false, labelWidth: 80 });
                    input.previousElementSibling.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                    window.dispatchEvent(new Event('mousemove'));
                });

                const outer = page.locator('.switch-outer');
                await expect(outer).not.toHaveClass(/\bswitch-dragging\b/);
                await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');

                await page.evaluate((_) => window.dispatchEvent(new MouseEvent('mouseup')));
                await expect(page.locator('#switch')).not.toBeChecked();
                await expect(outer).toHaveAttribute('aria-checked', 'false');
            });
        });
    });

    test.describe('transitions', () => {
        test('handles rapid interrupted transitions deterministically', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            const track = page.locator('.switch');
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate((_) => new Promise(requestAnimationFrame));
            await page.evaluate((_) => {
                $.getData('#switch', 'switch').setState(false);
            });
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate((_) => new Promise(requestAnimationFrame));
            await page.evaluate((_) => {
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
            await page.evaluate((_) => {
                UI.Switch.init($.findOne('#switch'), {
                    duration: 100,
                    labelWidth: 80,
                });
            });

            const outer = page.locator('.switch-outer');
            await outer.click({ force: true });
            const track = outer.locator('.switch');
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate((_) => new Promise(requestAnimationFrame));
            await outer.click({ force: true });
            await expect(page.locator('#switch')).not.toBeChecked();
            await expect(outer).toHaveAttribute('aria-checked', 'false');
        });

        test('completes when the track transition is canceled externally', async ({ page }) => {
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const component = UI.Switch.init(input, {
                    duration: 100,
                    labelWidth: 80,
                });
                component.setState(true);
            });

            const track = page.locator('.switch');
            await expect.poll(() => track.evaluate((node) => node.getAnimations().length)).toBe(1);
            await track.evaluate((_) => new Promise(requestAnimationFrame));
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                const transition = input.previousElementSibling.firstElementChild
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
            expect(await page.evaluate((_) => {
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
                    const input = document.querySelector('#switch');
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

            await page.evaluate((_) => {
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
            expect(await page.evaluate((_) => {
                const input = $.findOne('#switch');
                input.checked = true;
                UI.Switch.init(input, {
                    duration: 200,
                    labelWidth: 80,
                });
                return input.previousElementSibling.firstElementChild
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
                    const input = document.querySelector('#switch');
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
            await page.evaluate((_) => {
                const input = $.findOne('#switch');
                UI.Switch.init(input, {
                    duration: 1200,
                    labelWidth: 80,
                });
                const outer = input.previousElementSibling;
                outer.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
                window.dispatchEvent(new MouseEvent('mousemove', { clientX: 460 }));
            });

            const outer = page.locator('.switch-outer');
            const track = outer.locator('.switch');
            await expect(outer).toHaveClass(/\bswitch-dragging\b/);
            await expect(track).toHaveCSS('transition-duration', '0s');

            await page.evaluate((_) => {
                window.dispatchEvent(new MouseEvent('mouseup'));
            });
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
                    const component = UI.Switch.init(document.querySelector('#switch'), { duration, labelWidth: 80 });
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
            expect(onBox).not.toBeNull();
            expect(dividerBox).not.toBeNull();
            expect(offBox).not.toBeNull();
            expect(onBox.width).toBeGreaterThan(0);
            expect(offBox.width).toBe(onBox.width);
            expect(dividerBox.width).toBe(onBox.width / 2);
        });

        test('keeps measured labels unwrapped in a constrained layout', async ({ page }) => {
            await page.evaluate((_) => {
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
                    const input = document.querySelector('#switch');
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
            await page.evaluate((_) => {
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
                    const input = document.querySelector('#switch');
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
                    const input = document.querySelector('#switch');
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
