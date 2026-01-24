# Rowio

Rowio is a lightweight vanilla JavaScript library for building **repeatable form rows** from a `<template>`.

It is designed to be:

- framework-agnostic
- dependency-free
- fast (minimal initial HTML)
- event-driven

Rowio is suitable for admin panels, SaaS back offices, and complex forms where users need to add/remove rows dynamically.

Rowio consists of:

- **Rowio Free** – the open‑source JavaScript library (this repository)
- **Rowio Pro** – optional backend helpers and advanced features

---

## Features (Free)

- Render rows from a single `<template>`
- Unlimited rows (optional max limit)
- Hard add/remove with **full reindexing** (`name`, `id`, `label[for]`)
- Optional JSON prefill stored inside the template
- Copy-down helper for selected fields
- Multiple Rowio instances per page
- Clean DOM events for easy integration

---

## Features (Pro)

Rowio Pro extends the core library with production-ready helpers:

- PHP **RowioHarvester** (extracts and cleans row data from request bags)
- PHP **RowioValidator** (row-level and field-level validation)
- Frontend validation helpers (Bootstrap 5 compatible by default)
- Calculation helpers (pluggable callbacks with type normalization)

Rowio Pro is distributed separately under a commercial license.

---

## Requirements

- Modern browser with ES6 support
- No dependencies

---

## Basic HTML Structure

```html
<div class="rowio" data-rowio-prefix="items">

  <template class="rowio-template">
    <div class="rowio-row">
      <input type="text" name="items__name__0" id="items__name__0">
      <input type="number" name="items__qty__0" id="items__qty__0">

      <button type="button" class="rowio-add">+</button>
      <button type="button" class="rowio-remove">−</button>
    </div>

    <script type="application/json" class="rowio-data">
      [
        {"name": "Item A", "qty": 1},
        {"name": "Item B", "qty": 2}
      ]
    </script>
  </template>

  <div class="rowio-rows"></div>
</div>
```

---

## Naming Convention (Required)

Rowio relies on this format:

```
prefix__field__index
```

Example:

```
items__price__0
items__price__1
```

Indexing always starts at **0** and is automatically reindexed after add/remove.

This naming convention is required for compatibility with **Rowio Pro** backend helpers.

---

## JavaScript Usage

Rowio auto-initializes on DOM ready.

You can access an instance by key (override key or prefix):

```js
const instance = window.Rowio.get('items');

instance.add_row();
instance.remove_row(0);
const data = instance.get_data();
```

---

## Copy-Down Helper

Enable copy-down for specific fields:

```html
<div class="rowio" data-rowio-prefix="items" data-rowio-copydown="price,vat">
```

A copy-down control will appear next to those fields in the first row. Clicking it copies the value down to subsequent rows.

---

## Events

Rowio emits DOM events on the wrapper element:

- `rowio:ready`
- `rowio:row-add`
- `rowio:row-remove`
- `rowio:copy-down`
- `rowio:change`

Each event provides a payload with:

- `row` – the affected row element
- `index` – row index
- `fields` – inputs keyed by field name
- `editors` – detected WYSIWYG candidates

Example:

```js
document.querySelector('.rowio')
  .addEventListener('rowio:row-add', (e) => {
    console.log(e.detail);
  });
```

---

## JSON Prefill

Rows can be prefilled using JSON placed **inside the template**:

```html
<script type="application/json" class="rowio-data">
  [
    {"name": "Service", "qty": 1}
  ]
</script>
```

If JSON is present, `data-rowio-shown` is ignored.

⚠️ **Rowio does not sanitize JSON values.** Sanitize on the server if injecting user-generated content.

---

## Server-Side Processing (Rowio Pro)

Rowio Pro provides framework-agnostic PHP helpers:

- `RowioHarvester` – detects `prefix__field__index` keys, assembles rows, and cleans request data
- `RowioValidator` – validates row data (required fields, min/max rows, custom rules)

These helpers are designed to work with any PHP framework or custom application.

---

## License

Rowio Free is released under the **MIT License**.

Rowio Pro is distributed under a commercial license.

---

## Philosophy

Rowio focuses on doing **one thing well**:

> repeatable form rows, cleanly and predictably

Rowio Free stays small and transparent. Rowio Pro adds backend safety and advanced behavior where needed.

No frameworks, no magic, no lock-in.

