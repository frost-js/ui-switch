import { expect, test } from '#test';

test.describe('Switch form resets', () => {
    test.use({ mockClock: true });

    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<form id="form"><input id="switch" type="checkbox"></form>';
            UI.Switch.init($.findOne('#switch'), { animate: false, labelWidth: 80 });
        });
    });

    for (const checked of [false, true]) {
        test(`restores the ${checked ? 'checked' : 'unchecked'} default and toggles on the next click`, async ({ page }) => {
            await page.evaluate((checked) => {
                const input = $.findOne('#switch');
                input.defaultChecked = checked;
                $.getData(input, 'switch').setState(!checked);
                window.resetChanges = 0;
                $.addEvent(input, 'change.ui.switch', (_) => window.resetChanges++);
                input.form.reset();
            }, checked);
            await page.clock.runFor(1);

            await expect(page.locator('#switch')).toHaveJSProperty('checked', checked);
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', `${checked}`);
            await expect(page.locator('.switch')).toHaveCSS(
                'transform',
                `matrix(1, 0, 0, 1, ${checked ? 0 : -80}, 0)`,
            );
            expect(await page.evaluate((_) => window.resetChanges)).toBe(0);

            await page.locator('.switch-outer').click();
            await expect(page.locator('#switch')).toHaveJSProperty('checked', !checked);
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', `${!checked}`);
            expect(await page.evaluate((_) => window.resetChanges)).toBe(1);
        });
    }

    test('restores the unchecked position in RTL', async ({ page }) => {
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            $.getData(input, 'switch').dispose();
            input.dir = 'rtl';
            UI.Switch.init(input, { animate: false, labelWidth: 80 }).setState(true);
            input.form.reset();
        });
        await page.clock.runFor(1);

        await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 80, 0)');
    });

    test('handles an input associated with an external form', async ({ page }) => {
        await page.evaluate((_) => {
            $.append(document.body, '<input id="external" type="checkbox" form="form" checked>');
            UI.Switch.init($.findOne('#external'), { animate: false, labelWidth: 80 }).setState(false);
            $.findOne('#form').reset();
        });
        await page.clock.runFor(1);

        await expect(page.locator('#external')).toBeChecked();
        await expect(page.locator('.switch-outer').last()).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('.switch').last()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
    });

    test('finishes a reset when a later reset is canceled', async ({ page }) => {
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            $.getData(input, 'switch').setState(true);
            input.form.reset();
            input.form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
            input.form.reset();
        });
        await page.clock.runFor(1);

        await expect(page.locator('#switch')).not.toBeChecked();
        await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');
    });

    test('cancels an in-flight animation without changing the reset value later', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            $.getData(input, 'switch').dispose();
            UI.Switch.init(input, { labelWidth: 80, duration: 5000 }).setState(true);
            input.form.reset();
        });
        await page.clock.runFor(1);

        await expect(page.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');
        expect(await page.locator('.switch').evaluate((node) => node.getAnimations().length)).toBe(0);
        await page.clock.runFor(5100);
        await expect(page.locator('#switch')).not.toBeChecked();
        await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
    });

    test('does not interrupt an animation when reset is canceled', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            $.getData(input, 'switch').dispose();
            UI.Switch.init(input, { labelWidth: 80, duration: 5000 }).setState(true);
            input.form.addEventListener('reset', (event) => event.preventDefault());
            input.form.reset();
        });
        await page.clock.runFor(1);

        expect(await page.locator('.switch').evaluate((node) => ({
            transform: node.style.transform,
            animations: node.getAnimations().length,
        }))).toEqual({ transform: 'translateX(0px)', animations: 1 });
    });

    for (const canceled of [false, true]) {
        test(`handles a ${canceled ? 'canceled' : 'completed'} reset before a reduced-motion animation callback`, async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.evaluate((canceled) => {
                const input = $.findOne('#switch');
                $.getData(input, 'switch').dispose();
                UI.Switch.init(input, { labelWidth: 80 }).setState(true);
                if (canceled) {
                    input.form.addEventListener('reset', (event) => event.preventDefault());
                }
                input.form.reset();
            }, canceled);
            await page.clock.runFor(1);

            await expect(page.locator('#switch')).toHaveJSProperty('checked', canceled);
            await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', `${canceled}`);
            await expect(page.locator('.switch')).toHaveCSS(
                'transform',
                `matrix(1, 0, 0, 1, ${canceled ? 0 : -80}, 0)`,
            );
        });
    }

    test('preserves a state change requested after reset', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            $.getData(input, 'switch').dispose();
            const component = UI.Switch.init(input, { labelWidth: 80 });
            input.form.reset();
            component.setState(true);
        });
        await page.clock.runFor(1);

        await expect(page.locator('#switch')).toBeChecked();
        await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
    });

    test('ignores the remaining drag events after resetting mid-drag', async ({ page }) => {
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            input.previousElementSibling.dispatchEvent(new MouseEvent('mousedown', { clientX: 100 }));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 160 }));
            input.form.reset();
        });
        await page.clock.runFor(1);
        await page.evaluate((_) => {
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180 }));
            window.dispatchEvent(new MouseEvent('mouseup'));
            $.findOne('.switch-outer').click();
        });

        await expect(page.locator('#switch')).not.toBeChecked();
        await expect(page.locator('.switch-outer')).not.toHaveClass(/switch-dragging/);
        await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'false');
        await expect(page.locator('.switch')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -80, 0)');
        await page.locator('.switch-outer').click();
        await expect(page.locator('#switch')).toBeChecked();
    });

    test('clears drag click suppression on reset', async ({ page }) => {
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            input.previousElementSibling.dispatchEvent(new MouseEvent('mousedown', { clientX: 100 }));
            window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180 }));
            window.dispatchEvent(new MouseEvent('mouseup'));
            input.form.reset();
        });
        await page.clock.runFor(1);

        await expect(page.locator('#switch')).not.toBeChecked();
        await page.locator('.switch-outer').click();
        await expect(page.locator('#switch')).toBeChecked();
    });

    test('ignores a pending reset after disposal', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.evaluate((_) => {
            const input = $.findOne('#switch');
            $.getData(input, 'switch').setState(true);
            input.form.reset();
            $.getData(input, 'switch').dispose();
        });
        await page.clock.runFor(1);

        await expect(page.locator('.switch-outer')).toHaveCount(0);
        await expect(page.locator('#switch')).not.toBeChecked();
        expect(errors).toEqual([]);
    });

    test('keeps other instances subscribed when one is disposed', async ({ page }) => {
        await page.evaluate((_) => {
            $.append('#form', '<input id="other" type="checkbox" checked>');
            UI.Switch.init($.findOne('#other'), { animate: false, labelWidth: 80 }).setState(false);
            $.getData('#switch', 'switch').dispose();
            $.findOne('#form').reset();
        });
        await page.clock.runFor(1);

        await expect(page.locator('.switch-outer')).toHaveCount(1);
        await expect(page.locator('#other')).toBeChecked();
        await expect(page.locator('.switch-outer')).toHaveAttribute('aria-checked', 'true');
    });
});

test.describe('Switch form validation', () => {
    test('keeps required validation, focus redirection, and form submission working', async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<form><label for="switch">Notifications</label><input id="switch" name="notifications" value="yes" type="checkbox" required><button>Submit</button></form>';
            UI.Switch.init(document.querySelector('#switch'), { animate: false });
            window.submittedNotifications = null;
            document.querySelector('form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.submittedNotifications = new FormData(event.target).get('notifications');
            });
        });

        await page.getByRole('button', { name: 'Submit' }).click();
        expect(await page.evaluate((_) => window.submittedNotifications)).toBeNull();
        await expect(page.getByRole('switch', { name: 'Notifications' })).toBeFocused();
        expect(await page.locator('#switch').evaluate((node) => node.validity.valueMissing)).toBe(true);
        await expect(page.getByRole('checkbox')).toHaveCount(0);

        await page.locator('label').click();
        await expect(page.locator('#switch')).toBeChecked();
        await page.getByRole('button', { name: 'Submit' }).click();
        expect(await page.evaluate((_) => window.submittedNotifications)).toBe('yes');
        expect(await page.locator('#switch').evaluate((node) => node.validity.valid)).toBe(true);
    });
});
