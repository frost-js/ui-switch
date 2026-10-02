const $ = globalThis.fQuery;
const { Switch } = globalThis.UI;
const themeKey = 'frostui-switch-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;
    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);
        setTheme(theme);

        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    $('[data-ui-toggle="switch"]').switch();

    $.addEventDelegate(document, 'change.ui.switch', '#methods-switch', (event) => {
        const state = $.getProperty(event.currentTarget, 'checked') ? 'ON' : 'OFF';
        logEvent(`change.ui.switch — state: ${state}`);
    });

    $('[data-demo-method]').addEvent('click', (event) => {
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const node = $.findOne('#methods-switch');
        const current = $.getData(node, 'switch');

        switch (method) {
            case 'init':
                Switch.init(node);
                $.setText('#method-output', current ? 'Already initialized.' : 'Initialized.');
                break;
            case 'dispose':
                if (current) {
                    current.dispose();
                    $.setText('#method-output', 'Disposed. The original checkbox is restored.');
                } else {
                    $.setText('#method-output', 'Already disposed.');
                }
                break;
            case 'enable':
                Switch.init(node).enable();
                $.setText('#method-output', 'Enabled.');
                break;
            case 'disable':
                Switch.init(node).disable();
                $.setText('#method-output', 'Disabled.');
                break;
            case 'setStateOn':
                Switch.init(node).setState(true);
                $.setText('#method-output', 'Moving to the on state.');
                break;
            case 'setStateOff':
                Switch.init(node).setState(false);
                $.setText('#method-output', 'Moving to the off state.');
                break;
            case 'toggleState':
                Switch.init(node).toggleState();
                $.setText('#method-output', 'Toggling state.');
                break;
            case 'getState': {
                const state = Switch.init(node).getState() ? 'ON' : 'OFF';
                $.setText('#method-output', `Current state: ${state}.`);
                break;
            }
        }
    });
});
