# Frost UI Switch

[![CI](https://github.com/frost-js/ui-switch/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-switch/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-switch/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-switch)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-switch?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-switch)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-switch?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-switch)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-switch/main/dist/frost-ui-switch.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-switch/blob/main/dist/frost-ui-switch.min.js)
[![CSS gzip size](https://img.badgesize.io/frost-js/ui-switch/main/dist/frost-ui-switch.min.css?compression=gzip&label=CSS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-switch/blob/main/dist/frost-ui-switch.min.css)
[![license](https://img.shields.io/github/license/frost-js/ui-switch?style=flat-square)](./LICENSE)

Accessible toggle-switch control for Frost UI with configurable labels, semantic styles, sizes, CSS transitions, mouse and touch dragging, keyboard operation, and RTL support.

## Highlights

- Native checkbox remains the form control and source of truth
- Click, Space, Enter, mouse drag, and touch drag interaction
- Five Frost UI sizes with configurable text, semantic classes, and widths
- Frost UI v4 light, dark, system, focus, disabled, and RTL presentation
- Accessible switch role, state, required state, disabled state, and label association
- Native `Switch` class and `switch` fQuery plugin
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- Expanded and minified component CSS with source maps
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-switch
```

Frost UI Switch's package entry point is ESM-only and requires a browser DOM. Import the default `Switch` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-switch/dist/frost-ui-switch.min.css';
import Switch from '@fr0st/ui-switch';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

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
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui-switch.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-switch.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-switch@latest/dist/frost-ui-switch.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-switch@latest/dist/frost-ui-switch.min.js"></script>
<script>
    const { Switch } = globalThis.UI;
</script>
```

The UMD bundle adds `Switch` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

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

## Options

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `Switch.init()`

Resolved `instance.options` are shallow-frozen.

`Switch.defaults` and `Switch.classes` are static properties defined on the class. Set application-wide defaults before initializing components:

```js
Switch.defaults.size = 'sm';
Switch.defaults.duration = 240;
```

Changes to defaults apply to newly created instances. `Switch.classes` contains the structural and state class names used by the component; custom names need matching CSS and should be configured before initialization.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `animate` | `boolean` | `true` | Transition between checked and unchecked positions. |
| `dividerStyle` | `string` | `'bg-body-tertiary'` | Apply one or more Frost UI classes to the center divider. |
| `dividerWidth` | `number \| null` | `null` | Set the divider width in pixels. `null` derives half the label width. |
| `duration` | `number` | `500` | Set the full CSS transition duration in milliseconds. Partial movement scales the duration. |
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

Invalid, non-positive, or absent `labelWidth` values fall back to the wider measured label. Invalid, non-positive, or absent `dividerWidth` values use half the resolved label width. Invalid or non-positive durations update the component immediately.

If Switch is initialized while hidden, automatic sizing waits until the control becomes measurable. A temporary resize observer refreshes the layout when it appears, then disconnects. Explicit positive `labelWidth` values are applied immediately.

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. Arrays and objects use JSON. Supply callbacks and DOM nodes through JavaScript.

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

```js
import $ from '@fr0st/query';
import '@fr0st/ui-switch';

$('[data-ui-toggle="switch"]').switch();
```

Data attributes configure options; they do not initialize Switch by themselves. Initialize the component through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `Switch.init(node, options?)` | `Switch` | Return the existing instance for an element or create one. |
| `disable()` | `void` | Disable the checkbox, cancel any active drag, and make the rendered switch unavailable and unfocusable. |
| `dispose()` | `void` | Remove generated markup and events, unregister component state, and restore the original input. |
| `enable()` | `void` | Remove the checkbox's disabled attribute and refresh the rendered disabled state. |
| `getState()` | `boolean` | Return whether the original checkbox is checked. |
| `setState(checked)` | `void` | Normalize the value to a boolean and move to that state. |
| `toggleState()` | `void` | Move to the opposite target state. |

```js
switchControl.setState(true);
// With animation enabled, getState() updates when the transition completes.

switchControl.toggleState();
switchControl.disable();
switchControl.enable();
switchControl.dispose();
```

Calling `disable()` during a drag restores the displayed position to the checkbox's current state without emitting a change event. Further movement and release from that drag do not toggle the checkbox.

`dispose()` restores the input's original visually-hidden state, `aria-hidden`, and `tabindex`, preserves its current checked and disabled state and unrelated classes, and removes generated label IDs only if the application has not changed them. The input can then be initialized again with new options.

## Lifecycle

Calling `Switch.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original element as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases resources owned by the component and removes its registered instance. Repeated disposal is safe and does not affect a new instance initialized on the same element. Use a new instance before calling other methods after disposal.

If initialization fails, the component releases resources it created and removes its registered instance before rethrowing the error. The element can then be initialized again.

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

The underlying event type is `change`; fQuery exposes `event.namespace` as `ui.switch`. Setting the current state again does not emit another event. When transitions are enabled, the checkbox, ARIA state, and event update when the transition reaches its final position.

A native checkbox `change` event also moves the rendered control to match the input when no drag is active. Assigning `input.checked` alone does not notify Switch; use `setState()` or dispatch a native `change` event after assigning it.

Canceling a touch gesture restores the displayed and ARIA state from the checkbox without animating or emitting a change event. The next click or touch gesture remains available.

After a native form reset, Switch defers its refresh until the checkbox has reset, then restores the displayed and ARIA state without animating or emitting a change event. The refresh cancels active dragging or animation. Canceled resets leave the current interaction unchanged, and an explicit state change requested after the reset takes precedence. Inputs associated with a form through the `form` attribute are also supported.

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

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

- The rendered control uses `role="switch"`, `aria-checked`, `aria-required`, and `aria-disabled`.
- Explicit labels, wrapping labels, and existing `aria-labelledby` references contribute to the rendered control's accessible name.
- An input `aria-label` is copied when no label references are available.
- Labels without IDs receive temporary generated IDs while the component is active.
- The rendered control enters the tab order while the original checkbox becomes visually hidden and receives `aria-hidden="true"` and `tabindex="-1"` to expose a single accessible control.
- Space and Enter toggle the focused switch. Repeated keydown events are ignored.
- Disabled switches leave the tab order and ignore keyboard, click, mouse, and touch interaction.
- The original checkbox remains the submitted form field and preserves native `checked`, `required`, and `disabled` behavior.

Applications remain responsible for a meaningful visible label, instructions, validation feedback, and sufficient contrast when replacing the default semantic classes.

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

Switch combines its component stylesheet with Frost UI v4 CSS custom properties, focus-ring tokens, semantic text/background utilities, and disabled opacity.

```html
<section data-ui-theme="dark">
    <label for="dark-switch">Dark theme switch</label>
    <input id="dark-switch" type="checkbox">
</section>
```

Movement uses CSS `transform` transitions and respects `prefers-reduced-motion`. Initial checked state is rendered directly without an entrance transition.

Normal document and ancestor direction is respected. A `dir` attribute placed directly on the original input is also copied to the rendered control:

```html
<input id="rtl-switch" type="checkbox" dir="rtl">
```

In RTL layouts, the visual positions and physical drag direction are mirrored while checked state semantics remain unchanged.

### Custom Sass builds

Install Sass and create an application stylesheet to customize the component:

```bash
npm i -D sass
```

`src/styles.scss`

```scss
@use "@fr0st/ui-switch/src/scss/vars" with (
    $switch-padding-x: 1.25rem,
    $switch-border-radius: 999px
);
@use "@fr0st/ui-switch/src/scss/switch";
```

Compile the entry point with npm package resolution enabled:

```bash
npx sass --load-path=node_modules src/styles.scss dist/styles.css
```

Configure the [component variables](./src/scss/vars.scss) before loading the `switch` module. All variables have `!default` values. Include Frost UI CSS separately. Build tools that already resolve Sass modules from npm packages do not need the explicit load path.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI Switch is released under the [MIT License](./LICENSE).
