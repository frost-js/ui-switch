const $ = globalThis.$;
const { Switch } = globalThis.UI;

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const storedTheme = localStorage.getItem('frostui-switch-demo-theme');
setTheme(['light', 'dark'].includes(storedTheme) ? storedTheme : 'system');

$.ready(() => {
    $('[data-ui-toggle="switch"]').switch();

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);

        if (theme === 'system') {
            localStorage.removeItem('frostui-switch-demo-theme');
        } else {
            localStorage.setItem('frostui-switch-demo-theme', theme);
        }

        setTheme(theme);
    });

    $.addEventDelegate(document, 'change.ui.switch', '#methods-switch', (event) => {
        const entry = $.create('div', {
            class: 'small font-monospace py-2 border-bottom',
        });
        const state = event.currentTarget.checked ? 'ON' : 'OFF';

        $.setText(entry, `change.ui.switch — state: ${state}`);
        $.append('#event-log', entry);
        $.setScrollY('#event-log', $.height('#event-log', { boxSize: $.SCROLL_BOX }));
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

    $.addEvent('#clear-events', 'click', (_) => {
        $.empty('#event-log');
    });

    setTheme(document.documentElement.dataset.uiTheme || 'system');
});
