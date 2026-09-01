# Frost UI Switch

[![CI](https://github.com/frost-js/ui-switch/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-switch/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-switch/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-switch)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-switch?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-switch)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-switch?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-switch)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-switch/main/dist/frost-ui-switch.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-switch/blob/main/dist/frost-ui-switch.min.js)
[![CSS gzip size](https://img.badgesize.io/frost-js/ui-switch/main/dist/frost-ui-switch.min.css?compression=gzip&label=CSS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-switch/blob/main/dist/frost-ui-switch.min.css)
[![license](https://img.shields.io/github/license/frost-js/ui-switch?style=flat-square)](./LICENSE)

Accessible toggle-switch control for Frost UI with configurable labels, semantic styles, sizes, animation, mouse and touch dragging, keyboard operation, and RTL support.

## Highlights

- Native checkbox remains the form control and source of truth
- Click, Space, Enter, mouse drag, and touch drag interaction
- Five Frost UI sizes with configurable text, semantic classes, and widths
- Frost UI v3 light, dark, system, focus, disabled, and RTL presentation
- Accessible switch role, state, required state, disabled state, and label association
- Existing-instance reuse with frozen resolved options
- Native `Switch` class and `switch` fQuery plugin
- Reversible disposal that restores the input's original visibility and `tabindex`
- Prebuilt ESM and UMD bundles with source maps
- Expanded and minified component CSS with source maps
- JSDoc-powered IntelliSense

## Installation

### Browser projects / bundlers

Install Switch with its Frost UI and fQuery peers:

```bash
npm i @fr0st/ui-switch @fr0st/ui @fr0st/query
```

The package root resolves to the compiled ESM bundle. Import both required stylesheets and the default component export:

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-switch/dist/frost-ui-switch.min.css';
import Switch from '@fr0st/ui-switch';

const notifications = Switch.init(
    document.querySelector('#notifications'),
    {
        offText: 'Muted',
        onText: 'Enabled',
    },
);
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's UI and fQuery instances. The package root, `dist/*`, and `src/*` are available through package exports.

Switch requires a browser DOM or a compatible DOM environment configured through fQuery. Server-rendered applications should load the component on the client.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. Frost UI and fQuery also require `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-switch@latest/dist/frost-ui-switch.min.css">

<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import Switch from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-switch@latest/dist/frost-ui-switch.esm.min.js';

    Switch.init(document.querySelector('#notifications'));
</script>
```

### Browser (UMD)

Load Frost UI's all-in-one bundle before Switch. The UI bundle supplies both the `UI` and `fQuery` globals expected by the component:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-switch@latest/dist/frost-ui-switch.min.css">

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-switch@latest/dist/frost-ui-switch.min.js"></script>
<script>
    const notifications = UI.Switch.init(
        document.querySelector('#notifications'),
    );
</script>
```

The UMD bundle adds `Switch` to the existing `globalThis.UI` object. It expects `globalThis.UI` and `globalThis.fQuery` to exist before it loads. If the non-bundled Frost UI build is used instead, load fQuery, Frost UI, and Switch in that order.

## Usage

Start with a normal checkbox and an explicit or wrapping label. Switch inserts the visible control immediately before the input and visually hides the original checkbox while keeping it synchronized for forms:

```html
<label for="notifications">Notifications</label>
<input
    id="notifications"
    name="notifications"
    type="checkbox"
    value="yes"
    checked>
```

```js
import Switch from '@fr0st/ui-switch';

const notifications = Switch.init(
    document.querySelector('#notifications'),
    {
        offStyle: 'text-bg-secondary',
        offText: 'OFF',
        onStyle: 'text-bg-success',
        onText: 'ON',
        size: 'lg',
    },
);

console.log(notifications.getState()); // true
```

Calling `Switch.init()` again for the same input returns its existing instance. Dispose the current instance before reinitializing the input with different options.

## Options

Options are resolved in this order:

1. Component defaults
2. The input's `data-ui-*` attributes
3. Options passed to `Switch.init()`

Resolved `instance.options` are frozen.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `animate` | `boolean` | `true` | Animate movement between checked and unchecked positions. |
| `dividerStyle` | `string` | `'bg-body-tertiary'` | Apply one or more Frost UI classes to the center divider. |
| `dividerWidth` | `number \| null` | `null` | Set the divider width in pixels. `null` derives half the label width. |
| `duration` | `number` | `500` | Set the full animation duration in milliseconds. Partial movement scales the duration. |
| `labelWidth` | `number \| null` | `null` | Set both label widths in pixels. `null` measures the wider label. |
| `offStyle` | `string` | `'text-bg-secondary'` | Apply one or more Frost UI classes to the unchecked label. |
| `offText` | `string` | `'OFF'` | Set the unchecked label text. |
| `onStyle` | `string` | `'text-bg-primary'` | Apply one or more Frost UI classes to the checked label. |
| `onText` | `string` | `'ON'` | Set the checked label text. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Select the component font size and inline padding. |

```js
const switchControl = Switch.init(node, {
    animate: true,
    dividerStyle: 'bg-warning',
    dividerWidth: 16,
    duration: 240,
    labelWidth: 88,
    offStyle: 'text-bg-danger',
    offText: 'STOP',
    onStyle: 'text-bg-success',
    onText: 'GO',
    size: 'lg',
});
```

Invalid, non-positive, or absent widths fall back to measured dimensions. Invalid or non-positive durations update the component immediately.

## Data attributes

All options can be supplied through `data-ui-*` attributes:

| Attribute | Example |
| --- | --- |
| `data-ui-animate` | `data-ui-animate="false"` |
| `data-ui-divider-style` | `data-ui-divider-style="bg-warning"` |
| `data-ui-divider-width` | `data-ui-divider-width="16"` |
| `data-ui-duration` | `data-ui-duration="240"` |
| `data-ui-label-width` | `data-ui-label-width="88"` |
| `data-ui-off-style` | `data-ui-off-style="text-bg-danger"` |
| `data-ui-off-text` | `data-ui-off-text="STOP"` |
| `data-ui-on-style` | `data-ui-on-style="text-bg-success"` |
| `data-ui-on-text` | `data-ui-on-text="GO"` |
| `data-ui-size` | `data-ui-size="lg"` |

```html
<input
    id="availability"
    type="checkbox"
    data-ui-toggle="switch"
    data-ui-duration="240"
    data-ui-off-style="text-bg-danger"
    data-ui-off-text="BUSY"
    data-ui-on-style="text-bg-success"
    data-ui-on-text="FREE"
    data-ui-size="lg">
```

The component still needs to be initialized through the class or fQuery plugin. The demo uses `data-ui-toggle="switch"` as a shared initialization selector:

```js
$('[data-ui-toggle="switch"]').switch();
```

The `data-ui-toggle` attribute does not initialize Switch by itself.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Switch.init(node, options?)` | `Switch` | Return the existing instance for an input or create one. |
| `disable()` | `void` | Disable the checkbox and make the rendered switch unavailable and unfocusable. |
| `dispose()` | `void` | Remove generated markup and events, unregister component state, and restore the original input. |
| `enable()` | `void` | Enable the checkbox and restore rendered switch interaction. |
| `getState()` | `boolean` | Return whether the original checkbox is checked. |
| `setState(checked)` | `void` | Normalize the value to a boolean and move to that state. |
| `toggleState()` | `void` | Move to the opposite target state. |

```js
switchControl.setState(true);
console.log(switchControl.getState()); // true

switchControl.toggleState();
switchControl.disable();
switchControl.enable();
switchControl.dispose();
```

An instance also exposes its original input as `instance.node` and its frozen resolved configuration as `instance.options`. Both become `null` after disposal.

## Events

Switch emits one namespaced fQuery event from the original checkbox after a component-driven state change completes:

| Event | Description |
| --- | --- |
| `change.ui.switch` | The checked state changed through click, keyboard, drag, `setState()`, or `toggleState()`. |

```js
import $ from '@fr0st/query';

$.addEvent(
    '#notifications',
    'change.ui.switch',
    (event) => {
        console.log(event.currentTarget.checked);
    },
);
```

The underlying event type is `change`; fQuery exposes `event.namespace` as `ui.switch`. Setting the current state again does not emit another event. When animation is enabled, the checkbox, ARIA state, and event update when the animation reaches its final position.

A native checkbox `change` event also moves the rendered control to match the input, which keeps label activation and application-driven checkbox updates synchronized.

## fQuery API

Importing Switch registers `switch` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-switch';

const switchControl = $('#notifications').switch({
    onText: 'Enabled',
});

$('#notifications').switch('setState', true);

const checked = $('#notifications').switch('getState');

$('#notifications').switch('toggleState');
$('#notifications').switch('disable');
$('#notifications').switch('enable');
$('#notifications').switch('dispose');
```

Pass an options object to initialize every matched input, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

- The rendered control uses `role="switch"`, `aria-checked`, `aria-required`, and `aria-disabled`.
- Explicit labels, wrapping labels, and existing `aria-labelledby` references contribute to the rendered control's accessible name.
- An input `aria-label` is copied when no label references are available.
- Labels without IDs receive temporary generated IDs while the component is active.
- The rendered control enters the tab order while the original checkbox becomes visually hidden and receives `tabindex="-1"`.
- Space and Enter toggle the focused switch. Repeated keydown events are ignored.
- Disabled switches leave the tab order and ignore keyboard, click, mouse, and touch interaction.
- The original checkbox remains the submitted form field and preserves native `checked`, `required`, and `disabled` behavior.

Applications remain responsible for a meaningful visible label, instructions, validation feedback, and sufficient contrast when replacing the default semantic classes.

## Themes and RTL

Switch combines its component stylesheet with Frost UI v3 CSS custom properties, focus-ring tokens, semantic text/background utilities, and disabled opacity. Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly:

```html
<section data-ui-theme="dark">
    <label for="dark-switch">Dark theme switch</label>
    <input id="dark-switch" type="checkbox">
</section>
```

Normal document and ancestor direction is respected. A `dir` attribute placed directly on the original input is also copied to the rendered control:

```html
<input id="rtl-switch" type="checkbox" dir="rtl">
```

In RTL layouts, the visual positions and physical drag direction are mirrored while checked state semantics remain unchanged.

## Disposal

`dispose()` removes the rendered switch, component events, pending animation, drag click suppression, and registered fQuery component data. It restores the original input's pre-existing visually-hidden state and `tabindex` while preserving unrelated or runtime-added classes.

Generated label IDs are removed only when they still contain the component-generated value. Existing IDs and IDs changed by the application remain untouched. The input's current checked and disabled state are preserved.

```js
switchControl.dispose();

// The same input can now be initialized with new options.
const compactSwitch = Switch.init(node, { size: 'sm' });
```

## Migrating from v2 to v3

- Upgrade peer dependencies to `@fr0st/query ^4.1.2` and `@fr0st/ui ^3.0.0`.
- Load Frost UI v3 CSS together with `frost-ui-switch.css`; Switch still requires its component-specific layout stylesheet.
- Bundlers now resolve the package root to the compiled ESM bundle. Browser ESM consumers must provide import-map entries for `@fr0st/core`, `@fr0st/query`, and `@fr0st/ui`.
- UMD consumers should continue loading Frost UI's bundle first, then `frost-ui-switch.js`; the component extends the existing `globalThis.UI` namespace.
- Replace unsupported internal `_node` and `_options` access with the public `node` and `options` getters.
- Do not import legacy prototype or wrapper source paths. Use the package root, `dist/*`, or supported `src/*` exports.
- Public option names, class names, and methods remain available. v3 additionally fixes label association, disposal restoration, interrupted animation, zero-size layouts, touch dragging, and RTL movement.
- Development requires Node `^20.19.0`, `^22.13.0`, or `>=24`.

## Development

```bash
npm ci
npm run lint
npm run lint:sass:unused
npm run build
npm run test:browser
npm run test:coverage
```

`npm test` builds the bundles and runs the Playwright suite in Chromium, Firefox, and WebKit. Use `npm run test:headed` for headed browsers or `npm run test:ui` for Playwright's interactive runner.

## License

Frost UI Switch is released under the [MIT License](./LICENSE).
