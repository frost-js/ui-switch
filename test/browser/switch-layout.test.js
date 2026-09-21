import { expect, test } from '#test';
import { resetPage } from '../setup/browser.js';

test.describe('Switch hidden initialization', () => {
    test.beforeEach(async ({ page }) => {
        await resetPage(page);
        await page.evaluate((_) => {
            document.body.innerHTML = '<div id="panel" hidden><input id="switch" type="checkbox"></div>';
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

    for (const dir of ['ltr', 'rtl']) {
        for (const checked of [false, true]) {
            test(`measures an initially ${checked ? 'checked' : 'unchecked'} ${dir} switch when revealed`, async ({ page }) => {
                await page.evaluate(({ dir, checked }) => {
                    const input = $.findOne('#switch');
                    input.checked = checked;
                    input.dir = dir;

                    const reference = input.cloneNode();
                    reference.id = 'reference';
                    document.body.append(reference);

                    const options = { animate: false, offText: 'UNAVAILABLE' };
                    UI.Switch.init(reference, options);
                    UI.Switch.init(input, options);
                }, { dir, checked });

                await page.evaluate((_) => $.findOne('#panel').hidden = false);

                const outer = page.locator('#panel .switch-outer');
                await expect.poll(() => outer.evaluate((node) => parseFloat(node.style.width) || 0)).toBeGreaterThan(2);
                expect(await page.evaluate((_) => window.switchObservers.size)).toBe(0);

                const layouts = await page.evaluate((_) => ['switch', 'reference'].map((id) => {
                    const outer = document.getElementById(id).previousElementSibling;
                    const track = outer.querySelector('.switch');
                    return {
                        width: outer.getBoundingClientRect().width,
                        onWidth: outer.querySelector('.switch-toggle-on').getBoundingClientRect().width,
                        offWidth: outer.querySelector('.switch-toggle-off').getBoundingClientRect().width,
                        dividerWidth: outer.querySelector('.switch-toggle-divider').getBoundingClientRect().width,
                        transform: getComputedStyle(track).transform,
                        checked: outer.getAttribute('aria-checked'),
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
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            UI.Switch.init(input).setState(true);
            window.layoutChanges = 0;
            $.addEvent(input, 'change.ui.switch', (_) => window.layoutChanges++);
            $.findOne('#panel').hidden = false;
        });

        const outer = page.locator('#panel .switch-outer');
        await expect.poll(() => outer.evaluate((node) => parseFloat(node.style.width) || 0)).toBeGreaterThan(2);
        await expect(page.locator('#switch')).toBeChecked();
        await expect(outer).toHaveAttribute('aria-checked', 'true');
        await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
        expect(await page.evaluate((_) => window.layoutChanges)).toBe(0);
        expect(await page.evaluate((_) => window.switchObservers.size)).toBe(0);
    });

    test('applies explicit widths while hidden without observing', async ({ page }) => {
        await page.evaluate((_) => {
            UI.Switch.init($.findOne('#switch'), {
                animate: false,
                labelWidth: 80,
                dividerWidth: 20,
            });
        });

        const outer = page.locator('#panel .switch-outer');
        expect(await outer.evaluate((node) => node.style.width)).toBe('100px');
        expect(await page.evaluate((_) => window.switchObservers.size)).toBe(0);

        await page.evaluate((_) => $.findOne('#panel').hidden = false);
        await expect(outer).toHaveCSS('width', '100px');
        await expect(outer.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');
    });

    test('disconnects when disposed before becoming visible', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.evaluate((_) => UI.Switch.init($.findOne('#switch')));
        expect(await page.evaluate((_) => window.switchObservers.size)).toBe(1);

        await page.evaluate((_) => {
            $.getData('#switch', 'switch').dispose();
            $.findOne('#panel').hidden = false;
        });
        await page.evaluate((_) => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        await expect(page.locator('.switch-outer')).toHaveCount(0);
        await expect(page.locator('#switch')).toBeVisible();
        expect(await page.evaluate((_) => window.switchObservers.size)).toBe(0);
        expect(errors).toEqual([]);
    });
});
