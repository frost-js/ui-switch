import { expect, test } from '#test';

test.describe('Switch hidden initialization', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body, '<div id="panel" hidden><input id="switch" type="checkbox"></div>');
            window.switchObservers = new Set;
            window.ResizeObserver = class extends window.ResizeObserver {
                /** @inheritdoc */
                disconnect() {
                    window.switchObservers.delete(this);
                    super.disconnect();
                }

                /** @inheritdoc */
                observe(...args) {
                    window.switchObservers.add(this);
                    super.observe(...args);
                }
            };
        });
    });

    test('defers hidden layout without fixing widths to zero', async ({ page }) => {
        await page.evaluate(() => {
            const input = $.findOne('#switch');
            $.setProperty(input, 'checked', true);
            UI.Switch.init(input);
        });

        const outer = page.locator('.switch-outer');
        expect(await outer.evaluate((node) => [
            $.getStyle(node, 'width'),
            $.getStyle($.findOne('.switch', node), 'width'),
            $.getStyle($.findOne('.switch-toggle-on', node), 'width'),
            $.getStyle($.findOne('.switch-toggle-off', node), 'width'),
        ])).toEqual(['', '', '', '']);
        await expect(outer).toHaveAttribute('aria-checked', 'true');
        await expect(outer.locator('.switch')).not.toHaveAttribute('style', /NaN/);
    });

    test('applies explicit widths while hidden without observing', async ({ page }) => {
        await page.evaluate(() => {
            UI.Switch.init($.findOne('#switch'), {
                animate: false,
                labelWidth: 80,
                dividerWidth: 20,
            });
        });

        const outer = page.locator('#panel .switch-outer');
        expect(await outer.evaluate((node) => $.getStyle(node, 'width'))).toBe('100px');
        expect(await page.evaluate(() => window.switchObservers.size)).toBe(0);

        await page.evaluate(() => $.setProperty($.findOne('#panel'), 'hidden', false));
        await expect(outer).toHaveCSS('width', '100px');
        await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');
    });

    test('ignores dragging before hidden dimensions are available', async ({ page }) => {
        await page.evaluate(() => {
            const input = $.findOne('#switch');
            UI.Switch.init(input, { duration: 100 }).setState(true);
            input.previousElementSibling.dispatchEvent(new MouseEvent('mousedown', { clientX: 400 }));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
            window.dispatchEvent(new MouseEvent('mouseup'));
        });

        await expect(page.locator('#switch')).toBeChecked();
        await expect(page.locator('.switch')).toHaveAttribute('style', /transform: translateX\(0px\)/);
        await expect(page.locator('.switch')).not.toHaveAttribute('style', /NaN/);
    });

    for (const dir of ['ltr', 'rtl']) {
        for (const checked of [false, true]) {
            test(`measures an initially ${checked ? 'checked' : 'unchecked'} ${dir} switch when revealed`, async ({ page }) => {
                await page.evaluate(({ dir, checked }) => {
                    const input = $.findOne('#switch');
                    $.setProperty(input, 'checked', checked);
                    $.setProperty(input, 'dir', dir);

                    const reference = input.cloneNode();
                    $.setProperty(reference, 'id', 'reference');
                    $.append(document.body, reference);

                    const options = { animate: false, offText: 'UNAVAILABLE' };
                    UI.Switch.init(reference, options);
                    UI.Switch.init(input, options);
                }, { dir, checked });

                await page.evaluate(() => $.setProperty($.findOne('#panel'), 'hidden', false));

                const outer = page.locator('#panel .switch-outer');
                await expect.poll(() => outer.evaluate((node) => parseFloat($.getStyle(node, 'width')) || 0)).toBeGreaterThan(2);
                expect(await page.evaluate(() => window.switchObservers.size)).toBe(0);

                const layouts = await page.evaluate(() => ['switch', 'reference'].map((id) => {
                    const outer = $.findOneById(id).previousElementSibling;
                    const track = $.findOne('.switch', outer);
                    return {
                        width: outer.getBoundingClientRect().width,
                        onWidth: $.findOne('.switch-toggle-on', outer).getBoundingClientRect().width,
                        offWidth: $.findOne('.switch-toggle-off', outer).getBoundingClientRect().width,
                        dividerWidth: $.findOne('.switch-toggle-divider', outer).getBoundingClientRect().width,
                        transform: getComputedStyle(track).transform,
                        checked: $.getAttribute(outer, 'aria-checked'),
                    };
                }));
                expect(layouts[0]).toEqual(layouts[1]);

                await outer.click();
                await expect(page.locator('#switch')).toHaveJSProperty('checked', !checked);
                await expect(outer).toHaveAttribute('aria-checked', `${!checked}`);
            });
        }
    }

    test('preserves state changes made while hidden without emitting another change on reveal', async ({ page }) => {
        await page.evaluate(() => {
            const input = $.findOne('#switch');
            UI.Switch.init(input).setState(true);
            window.layoutChanges = 0;
            $.addEvent(input, 'change.ui.switch', () => window.layoutChanges++);
            $.setProperty($.findOne('#panel'), 'hidden', false);
        });

        const outer = page.locator('#panel .switch-outer');
        await expect.poll(() => outer.evaluate((node) => parseFloat($.getStyle(node, 'width')) || 0)).toBeGreaterThan(2);
        await expect(page.locator('#switch')).toBeChecked();
        await expect(outer).toHaveAttribute('aria-checked', 'true');
        await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
        expect(await page.evaluate(() => window.layoutChanges)).toBe(0);
        expect(await page.evaluate(() => window.switchObservers.size)).toBe(0);
    });

    test('disconnects when disposed before becoming visible', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.evaluate(() => UI.Switch.init($.findOne('#switch')));
        expect(await page.evaluate(() => window.switchObservers.size)).toBe(1);

        await page.evaluate(() => {
            $.getData('#switch', 'switch').dispose();
            $.setProperty($.findOne('#panel'), 'hidden', false);
        });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        await expect(page.locator('.switch-outer')).toHaveCount(0);
        await expect(page.locator('#switch')).toBeVisible();
        expect(await page.evaluate(() => window.switchObservers.size)).toBe(0);
        expect(errors).toEqual([]);
    });
});
