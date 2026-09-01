/** @import { SwitchOptions } from './switch.js'; */

import { initComponent } from '@fr0st/ui';
import Switch from './switch.js';

/** @type {SwitchOptions} */
Switch.defaults = {
    size: 'md',
    onStyle: 'text-bg-primary',
    offStyle: 'text-bg-secondary',
    dividerStyle: 'bg-body-tertiary',
    onText: 'ON',
    offText: 'OFF',
    labelWidth: null,
    dividerWidth: null,
    animate: true,
    duration: 500,
};

Switch.classes = {
    disabled: 'switch-disabled',
    hide: 'visually-hidden',
    outer: 'switch-outer',
    switch: 'switch',
    toggleDivider: 'switch-toggle-divider',
    toggleOff: 'switch-toggle-off',
    toggleOn: 'switch-toggle-on',
};

initComponent('switch', Switch);

export default Switch;
