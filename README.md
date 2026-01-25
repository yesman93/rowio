# Rowio (Free)

Rowio is a lightweight, framework-agnostic JavaScript library for building **repeatable form rows** using the native `<template>` element.

It solves one specific problem:

> Safely adding, removing, reindexing, and harvesting repeated form rows without magic.

Rowio Free focuses purely on **frontend behavior**. Backend helpers, validation, and calculations are provided by **Rowio Pro**.

[Demo page here](https://rowio.softicraft.com)

---

## Features

- Vanilla JavaScript (no dependencies)
- Multiple Rowio instances per page
- `<template>`-based row source
- Hard remove + full reindex (names, ids, labels)
- Optional JSON prefill
- Copy-down controls (field-based)
- Explicit DOM events for integrations
- Works with any backend or framework

---

## Installation

Download or include the script:

```html
<script src="rowio.js"></script>
```

No build step required.

---

## Basic HTML Structure

A working Rowio instance consists of:

1. A wrapper with class `.rowio`
2. A `<template class="rowio-template">` containing one `.rowio-row`
3. An optional `.rowio-rows` container (auto-created if missing)
4. Controls with `.rowio-add` and `.rowio-remove`

```html
<div class="rowio" data-rowio-prefix="items">

  <template class="rowio-template">
    <div class="rowio-row row gx-2">

      <div class="col">
        <input type="text" name="name" class="form-control" placeholder="Item name">
      </div>

      <div class="col">
        <input type="number" name="qty" class="form-control" placeholder="Qty">
      </div>

      <div class="col-auto">
        <button type="button" class="btn btn-danger rowio-remove">×</button>
      </div>

    </div>
  </template>

  <button type="button" class="btn btn-primary rowio-add">Add row</button>

</div>
```

### Important

- Fields inside the template **must not be indexed**
- Rowio will automatically convert them to:

```
items__name__0
items__qty__0
items__name__1
items__qty__1
...
```

---

## Initialization

Initialization is manual by design.

```html
<script>
document.addEventListener('DOMContentLoaded', () => {
  Rowio.init();
});
</script>
```

You can also target a specific element or selector:

```js
Rowio.init('.rowio');
Rowio.init(document.querySelector('.rowio'));
Rowio.init(document.querySelectorAll('.rowio'));
```

---

## Configuration (Data Attributes)

Configured on the `.rowio` wrapper:

- `data-rowio-prefix` – **required**, input name prefix
- `data-rowio-shown` – initial number of rows (default: 1)
- `data-rowio-max` – maximum allowed rows (0 = unlimited)
- `data-rowio-copy-down` – comma-separated field names
- `data-rowio-copy-down-class` – CSS classes for copy-down buttons

Optional on `<template>`:

- `data-rowio-key` – override instance key

Optional on inputs / editors (`<input>`, `<select>`, `<textarea>` or `contenteditable="true"`):

- `data-rowio-default` - default value for new rows
- `data-rowio-html` - use `innerHTML` instead of `textContent` (for `contenteditable="true"`)

---

## JSON Prefill

Rows can be prefilled by embedding JSON inside the template:

```html
<template class="rowio-template">
  <script type="application/json" class="rowio-data">
    [
      { "name": "Apple", "qty": 2 },
      { "name": "Banana", "qty": 5 }
    ]
  </script>

  <!-- row markup -->
</template>
```

> ⚠️ Rowio does **not** sanitize prefill data.

---

## Events

Rowio emits `CustomEvent`s on the wrapper element:

- `rowio:ready` - after initialization
- `rowio:row-add` - after a row is added and rows reindexed
- `rowio:row-remove` - after a row is removed and rows reindexed
- `rowio:copy-down` - after a copy-down action
- `rowio:change` - after any change (add, remove, copy-down)
- `rowio:max-rows-reached` - when trying to exceed max rows

Example:

```js
wrapper.addEventListener('rowio:change', e => {
  const { row, index, fields } = e.detail;
  // re-init plugins, recalc totals, validate, etc.
});
```

---

## Backend Handling

Rowio Free only guarantees **correct naming and indexing**.

Backend parsing, validation, normalization, and calculations are handled by **Rowio Pro**.

---

## Browser Support

- Modern evergreen browsers
- Requires `<template>` support

---

## License

MIT License

---

## Related

- **Rowio Pro** – extended by validation, calculations and backend helpers

---

## Philosophy

Rowio is intentionally boring.

It does not guess, auto-submit, validate, or sanitize. It only guarantees one thing:

> Repeatable rows that stay structurally correct.

Everything else is your choice.

