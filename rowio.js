/**
 * Rowio (FREE) - Repeatable form rows with <template> source
 *
 * - Supports multiple instances on page (multiple ".rowio" wrappers)
 * - Renders rows from <template class="rowio-template"> into ".rowio-rows"
 * - Unlimited rows (optional max)
 * - Hard remove + full reindex (name/id/label[for])
 * - Copy-down controls by field names (optional)
 * - Optional JSON prefill inside template (script.rowio-data)
 * - Emits events:
 *   - rowio:ready
 *   - rowio:row-add   -> then rowio:change
 *   - rowio:row-remove-> then rowio:change
 *   - rowio:copy-down -> then rowio:change
 *
 * Notes:
 * - Rowio does NOT sanitize JSON prefill values (document this in README)
 * - WYSIWYG/editor init is handled by userland listeners (Rowio only emits events)
 *
 * Naming convention (required for reindex + harvesting):
 *   prefix__field__0
 *
 * @author TB
 * @date 24.1.2026
 */
Object.defineProperty(window, 'Rowio', {

    /**
     * Prevents reconfiguration of the 'Rowio' property on window.
     *
     * @author TB
     * @date 24.1.2026
     *
     * @type {Boolean}
     */
    configurable: false,

    /**
     * Prevents overwriting the 'Rowio' property on window.
     *
     * @author TB
     * @date 24.1.2026
     *
     * @type {Boolean}
     */
    writable: false,

    /**
     * Lazy singleton getter (Modalio/Loast style).
     *
     * @author TB
     * @date 24.1.2026
     */
    get: (function () {

        /**
         * Internal cached instance of the Rowio singleton.
         *
         * @author TB
         * @date 24.1.2026
         *
         * @type {Object|null}
         */
        let _instance = null;

        return function () {

            if (_instance) {
                return _instance;
            }

            _instance = {

                /**
                 * Instances registry (key -> instance)
                 * Key = override key (data-rowio-key) or prefix (data-rowio-prefix).
                 *
                 * @author TB
                 * @date 24.1.2026
                 *
                 * @type {Object.<string, Object>}
                 */
                instances: {},

                /**
                 * Initializes all Rowio components found on page.
                 *
                 * @author TB
                 * @date 24.1.2026
                 *
                 * @returns {void}
                 */
                init: function () {

                    const wrappers = document.querySelectorAll('.rowio');
                    if (!wrappers.length) {
                        return;
                    }

                    wrappers.forEach((wrapper) => {

                        // prevent double init
                        if (wrapper.dataset.rowioInited === '1') {
                            return;
                        }

                        const instance = this._create_instance(wrapper);
                        if (!instance) {
                            return;
                        }

                        this.instances[instance.key] = instance;
                        wrapper.dataset.rowioInited = '1';

                        instance._init();
                    });
                },

                /**
                 * Returns an instance by key (override key or prefix).
                 *
                 * Usage:
                 *   const instance = window.Rowio.get('invoice-items');
                 *
                 * @author TB
                 * @date 24.1.2026
                 *
                 * @param {String} key
                 * @returns {Object|null}
                 */
                get: function (key) {

                    if (!key || typeof key !== 'string') {
                        return null;
                    }

                    return this.instances[key] ? this.instances[key] : null;
                },

                /**
                 * Creates a Rowio instance for a wrapper.
                 *
                 * @author TB
                 * @date 24.1.2026
                 *
                 * @param {HTMLElement} wrapper
                 * @returns {Object|null}
                 */
                _create_instance: function (wrapper) {

                    if (!wrapper || !(wrapper instanceof HTMLElement)) {
                        return null;
                    }

                    const template = wrapper.querySelector('template.rowio-template');
                    const rows_container = wrapper.querySelector('.rowio-rows');

                    if (!template) {
                        // template is required
                        return null;
                    }

                    if (!rows_container) {
                        // rows container is required
                        return null;
                    }

                    const prefix = (wrapper.dataset.rowioPrefix || '').trim();
                    const shown = this._to_int(wrapper.dataset.rowioShown, 1);
                    const max = this._to_int(wrapper.dataset.rowioMax, 0); // 0 = unlimited
                    const copydown = (wrapper.dataset.rowioCopydown || '').trim();

                    const override_key = (template.dataset.rowioKey || '').trim();
                    const key = override_key.length ? override_key : prefix;

                    if (!key.length) {
                        // cannot register instance without key
                        return null;
                    }

                    return {

                        /**
                         * Instance key (override key or prefix).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {String}
                         */
                        key: key,

                        /**
                         * Name prefix (usually equals wrapper data-rowio-prefix).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {String}
                         */
                        prefix: prefix,

                        /**
                         * Wrapper element (event target).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {HTMLElement}
                         */
                        wrapper: wrapper,

                        /**
                         * Template element (source of row markup & JSON config).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {HTMLTemplateElement}
                         */
                        template: template,

                        /**
                         * Rows container (render target).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {HTMLElement}
                         */
                        rows_container: rows_container,

                        /**
                         * Initially shown rows (used only if no JSON prefill).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {Number}
                         */
                        shown: shown,

                        /**
                         * Max rows (0 means unlimited).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {Number}
                         */
                        max: max,

                        /**
                         * Copy-down enabled field names list, comma-separated.
                         * Example: "email,vat_id"
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {String}
                         */
                        copydown: copydown,

                        /**
                         * Override key (template data-rowio-key).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {String}
                         */
                        override_key: override_key,

                        /**
                         * Internal cached template row element.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {HTMLElement|null}
                         */
                        _template_row: null,

                        /**
                         * Internal JSON prefill data.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @type {Array|null}
                         */
                        _prefill_data: null,

                        /**
                         * Initializes the instance.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _init: function () {

                            this._ensure_override_hidden();
                            this._cache_template_row();
                            this._read_prefill_json();

                            this._bind_events();
                            this._render_initial_rows();
                            this._setup_copydown_controls();

                            // ready event
                            this._emit('rowio:ready', {
                                row: null,
                                index: null
                            });
                        },

                        /**
                         * Adds a row at the end.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {Object|null} row_data
                         * @returns {HTMLElement|null}
                         */
                        add_row: function (row_data) {

                            if (this.max > 0 && this.get_rows_count() >= this.max) {
                                return null;
                            }

                            const row = this._clone_template_row();
                            if (!row) {
                                return null;
                            }

                            this.rows_container.appendChild(row);

                            // reindex always (names/ids/for)
                            this._reindex_rows();

                            // apply defaults and/or prefill
                            if (row_data && typeof row_data === 'object') {
                                this._fill_row_from_data(row, row_data);
                            } else {
                                this._apply_defvals(row);
                            }

                            const index = this._get_row_index(row);

                            this._emit('rowio:row-add', this._make_payload(row, index));
                            this._emit('rowio:change', this._make_payload(row, index));

                            return row;
                        },

                        /**
                         * Removes a row by index or by row element.
                         * Hard remove + full reindex.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {Number|HTMLElement} row_or_index
                         * @returns {Boolean}
                         */
                        remove_row: function (row_or_index) {

                            const rows = this._get_rows();
                            if (!rows.length) {
                                return false;
                            }

                            // always keep at least 1 row
                            if (rows.length <= 1) {
                                return false;
                            }

                            let row = null;

                            if (typeof row_or_index === 'number') {
                                row = rows[row_or_index] ? rows[row_or_index] : null;
                            } else if (row_or_index instanceof HTMLElement) {
                                row = row_or_index;
                            }

                            if (!row) {
                                return false;
                            }

                            const removed_index = this._get_row_index(row);

                            row.remove();

                            // reindex remaining rows
                            this._reindex_rows();

                            this._emit('rowio:row-remove', {
                                instance: this,
                                row: null,
                                index: removed_index,
                                fields: {},
                                editors: []
                            });
                            this._emit('rowio:change', {
                                instance: this,
                                row: null,
                                index: removed_index,
                                fields: {},
                                editors: []
                            });

                            // copydown controls need to exist on first visible row
                            this._setup_copydown_controls();

                            return true;
                        },

                        /**
                         * Returns current visible rows count.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {Number}
                         */
                        get_rows_count: function () {
                            return this._get_rows().length;
                        },

                        /**
                         * Returns rows data as array of objects: [{field: value, ...}, ...]
                         * Uses parsed field names from input "name" attributes.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {Array}
                         */
                        get_data: function () {

                            const rows = this._get_rows();
                            const out = [];

                            rows.forEach((row) => {
                                const payload = this._make_payload(row, this._get_row_index(row));
                                const obj = {};

                                Object.keys(payload.fields).forEach((field) => {
                                    const el_or_arr = payload.fields[field];

                                    if (Array.isArray(el_or_arr)) {
                                        obj[field] = el_or_arr.map((el) => this._read_value(el));
                                    } else {
                                        obj[field] = this._read_value(el_or_arr);
                                    }
                                });

                                out.push(obj);
                            });

                            return out;
                        },

                        /**
                         * Ensures hidden input mapping override key for harvester:
                         * __rowio_key__{prefix} = {override_key}
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _ensure_override_hidden: function () {

                            if (!this.override_key.length) {
                                return;
                            }

                            if (!this.prefix.length) {
                                // cannot map without prefix
                                return;
                            }

                            const name = '__rowio_key__' + this.prefix;

                            // already present?
                            if (this.wrapper.querySelector('input[type="hidden"][name="' + CSS.escape(name) + '"]')) {
                                return;
                            }

                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = name;
                            input.value = this.override_key;

                            this.wrapper.appendChild(input);
                        },

                        /**
                         * Caches the row element from template.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _cache_template_row: function () {

                            // template.content is a DocumentFragment
                            const content = this.template.content;
                            if (!content) {
                                return;
                            }

                            const row = content.querySelector('.rowio-row');
                            if (!row) {
                                return;
                            }

                            this._template_row = row;
                        },

                        /**
                         * Reads JSON prefill data from:
                         * <script type="application/json" class="rowio-data">[...]</script>
                         * placed inside template.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _read_prefill_json: function () {

                            const script = this.template.content
                                ? this.template.content.querySelector('script.rowio-data[type="application/json"]')
                                : null;

                            if (!script) {
                                this._prefill_data = null;
                                return;
                            }

                            const raw = (script.textContent || '').trim();
                            if (!raw.length) {
                                this._prefill_data = null;
                                return;
                            }

                            try {
                                const parsed = JSON.parse(raw);
                                this._prefill_data = Array.isArray(parsed) ? parsed : null;
                            } catch (e) {
                                this._prefill_data = null;
                            }
                        },

                        /**
                         * Binds click handlers on wrapper (event delegation).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _bind_events: function () {

                            // bind only once per instance
                            if (this.wrapper.dataset.rowioBound === '1') {
                                return;
                            }
                            this.wrapper.dataset.rowioBound = '1';

                            this.wrapper.addEventListener('click', (e) => {

                                const add_btn = e.target.closest('.rowio-add');
                                if (add_btn && this.wrapper.contains(add_btn)) {
                                    e.preventDefault();
                                    this.add_row(null);
                                    this._setup_copydown_controls();
                                    return;
                                }

                                const remove_btn = e.target.closest('.rowio-remove');
                                if (remove_btn && this.wrapper.contains(remove_btn)) {
                                    e.preventDefault();
                                    const row = remove_btn.closest('.rowio-row');
                                    if (row) {
                                        this.remove_row(row);
                                    }
                                    return;
                                }

                                const cd_btn = e.target.closest('.rowio-copydown');
                                if (cd_btn && this.wrapper.contains(cd_btn)) {
                                    e.preventDefault();
                                    const field = (cd_btn.dataset.rowioField || '').trim();
                                    const row = cd_btn.closest('.rowio-row');
                                    if (field.length && row) {
                                        this._copy_down(field, row);
                                    }
                                }
                            });
                        },

                        /**
                         * Renders initial rows based on JSON or shown count.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _render_initial_rows: function () {

                            // clear any existing rows (Rowio owns rendering)
                            this.rows_container.innerHTML = '';

                            if (this._prefill_data && this._prefill_data.length) {

                                // respect max
                                const limit = (this.max > 0)
                                    ? Math.min(this._prefill_data.length, this.max)
                                    : this._prefill_data.length;

                                for (let i = 0; i < limit; i += 1) {
                                    this.add_row(this._prefill_data[i]);
                                }

                                return;
                            }

                            // fallback to shown count (min is always 1)
                            const count = Math.max(1, this.shown);
                            for (let i = 0; i < count; i += 1) {
                                this.add_row(null);
                            }
                        },

                        /**
                         * Creates copydown controls for configured fields
                         * on the first row (if not already present).
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _setup_copydown_controls: function () {

                            // remove existing controls to avoid duplicates
                            this.wrapper.querySelectorAll('.rowio-copydown').forEach((x) => x.remove());

                            const fields = this._parse_csv(this.copydown);
                            if (!fields.length) {
                                return;
                            }

                            const rows = this._get_rows();
                            if (!rows.length) {
                                return;
                            }

                            const first_row = rows[0];
                            const payload = this._make_payload(first_row, 0);

                            fields.forEach((field) => {

                                const el_or_arr = payload.fields[field] ? payload.fields[field] : null;
                                const el = Array.isArray(el_or_arr) ? el_or_arr[0] : el_or_arr;

                                if (!el) {
                                    return;
                                }

                                // create button next to the input (simple and framework-agnostic)
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = 'rowio-copydown';
                                btn.dataset.rowioField = field;
                                btn.setAttribute('aria-label', 'Copy down: ' + field);
                                btn.innerHTML = '↓';

                                // insert right after element
                                el.insertAdjacentElement('afterend', btn);
                            });
                        },

                        /**
                         * Copies a field value from the given row down to subsequent rows.
                         * Emits rowio:copy-down and rowio:change.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {String} field
                         * @param {HTMLElement} source_row
                         * @returns {void}
                         */
                        _copy_down: function (field, source_row) {

                            const rows = this._get_rows();
                            if (!rows.length) {
                                return;
                            }

                            const source_index = this._get_row_index(source_row);
                            if (source_index === null) {
                                return;
                            }

                            const source_payload = this._make_payload(source_row, source_index);
                            const source_el_or_arr = source_payload.fields[field] ? source_payload.fields[field] : null;
                            const source_el = Array.isArray(source_el_or_arr) ? source_el_or_arr[0] : source_el_or_arr;

                            if (!source_el) {
                                return;
                            }

                            const source_value = this._read_value(source_el);

                            // apply to next rows only
                            for (let i = source_index + 1; i < rows.length; i += 1) {

                                const row = rows[i];
                                const payload = this._make_payload(row, i);
                                const el_or_arr = payload.fields[field] ? payload.fields[field] : null;

                                if (!el_or_arr) {
                                    continue;
                                }

                                const targets = Array.isArray(el_or_arr) ? el_or_arr : [el_or_arr];
                                targets.forEach((target) => {
                                    this._write_value(target, source_value);
                                });
                            }

                            this._emit('rowio:copy-down', this._make_payload(source_row, source_index));
                            this._emit('rowio:change', this._make_payload(source_row, source_index));
                        },

                        /**
                         * Clones the template row element.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {HTMLElement|null}
                         */
                        _clone_template_row: function () {

                            if (!this._template_row) {
                                return null;
                            }

                            const row = this._template_row.cloneNode(true);

                            // ensure it's an element
                            if (!(row instanceof HTMLElement)) {
                                return null;
                            }

                            return row;
                        },

                        /**
                         * Applies data-rowio-defval defaults for inputs/selects/textareas/contenteditable.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} row
                         * @returns {void}
                         */
                        _apply_defvals: function (row) {

                            const els = this._get_row_fields_elements(row);

                            els.forEach((el) => {

                                const defval = (el.dataset.rowioDefval || '').toString();

                                // if no defval, clear inputs (keep blank template behavior)
                                if (!defval.length) {
                                    // do not wipe buttons, etc.
                                    if (this._is_value_element(el)) {
                                        this._write_value(el, '');
                                    }
                                    return;
                                }

                                this._write_value(el, defval);
                            });
                        },

                        /**
                         * Fills row from JSON data object by field names.
                         * Only fills fields that exist in row; unknown keys are ignored.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} row
                         * @param {Object} data
                         * @returns {void}
                         */
                        _fill_row_from_data: function (row, data) {

                            // first apply defaults to get deterministic baseline
                            this._apply_defvals(row);

                            const payload = this._make_payload(row, this._get_row_index(row));

                            Object.keys(data).forEach((field) => {

                                if (!payload.fields[field]) {
                                    return;
                                }

                                const el_or_arr = payload.fields[field];
                                const targets = Array.isArray(el_or_arr) ? el_or_arr : [el_or_arr];

                                targets.forEach((target) => {
                                    this._write_value(target, data[field]);
                                });
                            });
                        },

                        /**
                         * Reindexes all rows: updates name/id and label[for].
                         * Index starts at 0.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _reindex_rows: function () {

                            const rows = this._get_rows();
                            if (!rows.length) {
                                return;
                            }

                            rows.forEach((row, new_index) => {

                                // update fields inside row
                                const els = this._get_row_fields_elements(row);

                                els.forEach((el) => {

                                    // Prefer name; fallback to id
                                    const name = (el.getAttribute('name') || '').trim();
                                    const id = (el.getAttribute('id') || '').trim();

                                    // update name
                                    if (name.length) {

                                        const parsed = this._parse_key(name);
                                        if (parsed) {
                                            const new_name = parsed.prefix + '__' + parsed.field + '__' + new_index;
                                            el.setAttribute('name', new_name);
                                        }
                                    }

                                    // update id
                                    if (id.length) {

                                        const parsed = this._parse_key(id);
                                        if (parsed) {

                                            const old_id = id;
                                            const new_id = parsed.prefix + '__' + parsed.field + '__' + new_index;

                                            el.setAttribute('id', new_id);

                                            // update labels inside row that reference this id
                                            row.querySelectorAll('label[for="' + CSS.escape(old_id) + '"]').forEach((lab) => {
                                                lab.setAttribute('for', new_id);
                                            });
                                        }
                                    }
                                });
                            });

                            // after reindex, enforce add/remove disabled states if you want (optional)
                            this._update_buttons_state();
                        },

                        /**
                         * Updates add/remove buttons disabled state.
                         * - remove disabled if only 1 row left
                         * - add disabled if max reached
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {void}
                         */
                        _update_buttons_state: function () {

                            const rows_count = this.get_rows_count();

                            const remove_disabled = rows_count <= 1;
                            const add_disabled = (this.max > 0) ? (rows_count >= this.max) : false;

                            this.wrapper.querySelectorAll('.rowio-remove').forEach((btn) => {
                                btn.disabled = remove_disabled;
                                if (remove_disabled) {
                                    btn.setAttribute('disabled', 'disabled');
                                } else {
                                    btn.removeAttribute('disabled');
                                }
                            });

                            this.wrapper.querySelectorAll('.rowio-add').forEach((btn) => {
                                btn.disabled = add_disabled;
                                if (add_disabled) {
                                    btn.setAttribute('disabled', 'disabled');
                                } else {
                                    btn.removeAttribute('disabled');
                                }
                            });
                        },

                        /**
                         * Returns row elements.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @returns {HTMLElement[]}
                         */
                        _get_rows: function () {
                            return Array.from(this.rows_container.querySelectorAll('.rowio-row'));
                        },

                        /**
                         * Returns row index from first field parsed, fallback by DOM order.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} row
                         * @returns {Number|null}
                         */
                        _get_row_index: function (row) {

                            const els = this._get_row_fields_elements(row);
                            for (let i = 0; i < els.length; i += 1) {

                                const name = (els[i].getAttribute('name') || '').trim();
                                const id = (els[i].getAttribute('id') || '').trim();

                                const parsed = this._parse_key(name.length ? name : id);
                                if (parsed) {
                                    return parsed.index;
                                }
                            }

                            // fallback: DOM position
                            const rows = this._get_rows();
                            const pos = rows.indexOf(row);

                            return pos >= 0 ? pos : null;
                        },

                        /**
                         * Builds payload for events: row/index/fields/editors.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} row
                         * @param {Number|null} index
                         * @returns {Object}
                         */
                        _make_payload: function (row, index) {

                            const fields = {};
                            const editors = [];

                            if (row) {

                                const els = this._get_row_fields_elements(row);

                                els.forEach((el) => {

                                    // editor candidates
                                    if (el.classList && el.classList.contains('tinymce-editor')) {
                                        editors.push(el);
                                    }
                                    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
                                        editors.push(el);
                                    }

                                    const name = (el.getAttribute('name') || '').trim();
                                    const id = (el.getAttribute('id') || '').trim();

                                    const parsed = this._parse_key(name.length ? name : id);
                                    if (!parsed) {
                                        return;
                                    }

                                    const field = parsed.field;

                                    if (typeof fields[field] === 'undefined') {
                                        fields[field] = el;
                                    } else if (Array.isArray(fields[field])) {
                                        fields[field].push(el);
                                    } else {
                                        fields[field] = [fields[field], el];
                                    }
                                });
                            }

                            return {
                                instance: this,
                                row: row,
                                index: index,
                                fields: fields,
                                editors: editors
                            };
                        },

                        /**
                         * Emits a CustomEvent on wrapper with detail payload.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {String} name
                         * @param {Object} payload
                         * @returns {void}
                         */
                        _emit: function (name, payload) {

                            const event = new CustomEvent(name, {
                                bubbles: true,
                                cancelable: false,
                                detail: payload
                            });

                            this.wrapper.dispatchEvent(event);
                        },

                        /**
                         * Returns row field elements:
                         * - input/select/textarea
                         * - elements with contenteditable="true"
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} row
                         * @returns {HTMLElement[]}
                         */
                        _get_row_fields_elements: function (row) {

                            const out = [];

                            // inputs/selects/textareas
                            row.querySelectorAll('input, select, textarea').forEach((el) => {
                                out.push(el);
                            });

                            // contenteditable elements
                            row.querySelectorAll('[contenteditable="true"]').forEach((el) => {
                                out.push(el);
                            });

                            return out;
                        },

                        /**
                         * Parses key in format: prefix__field__index
                         * Returns null if not valid.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {String} key
                         * @returns {Object|null}
                         */
                        _parse_key: function (key) {

                            if (!key || typeof key !== 'string') {
                                return null;
                            }

                            // fast precheck
                            const pos = key.indexOf('__');
                            if (pos <= 0) {
                                return null;
                            }

                            const parts = key.split('__');
                            if (parts.length !== 3) {
                                return null;
                            }

                            const prefix = parts[0];
                            const field = parts[1];
                            const index_raw = parts[2];

                            if (!prefix.length || !field.length) {
                                return null;
                            }

                            const index = parseInt(index_raw, 10);
                            if (Number.isNaN(index)) {
                                return null;
                            }

                            return {
                                prefix: prefix,
                                field: field,
                                index: index
                            };
                        },

                        /**
                         * Reads a value from element in a generic way.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} el
                         * @returns {*}
                         */
                        _read_value: function (el) {

                            if (!el) {
                                return '';
                            }

                            if (el instanceof HTMLInputElement) {

                                if (el.type === 'checkbox') {
                                    return el.checked ? 1 : 0;
                                }

                                if (el.type === 'radio') {
                                    return el.checked ? el.value : '';
                                }

                                return el.value;
                            }

                            if (el instanceof HTMLSelectElement) {
                                return el.value;
                            }

                            if (el instanceof HTMLTextAreaElement) {
                                return el.value;
                            }

                            if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
                                return el.textContent;
                            }

                            return '';
                        },

                        /**
                         * Writes a value to element in a generic way.
                         * Triggers "change" event on value elements for easy integration.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} el
                         * @param {*} value
                         * @returns {void}
                         */
                        _write_value: function (el, value) {

                            if (!el) {
                                return;
                            }

                            // normalize undefined/null
                            if (typeof value === 'undefined' || value === null) {
                                value = '';
                            }

                            if (el instanceof HTMLInputElement) {

                                if (el.type === 'checkbox') {
                                    el.checked = (value === 1 || value === '1' || value === true);
                                } else if (el.type === 'radio') {
                                    el.checked = (el.value === value);
                                } else {
                                    el.value = value;
                                }

                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                            }

                            if (el instanceof HTMLSelectElement) {
                                el.value = value;
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                            }

                            if (el instanceof HTMLTextAreaElement) {
                                el.value = value;
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                            }

                            if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
                                el.textContent = String(value);
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        },

                        /**
                         * Returns true if element is considered a value element.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {HTMLElement} el
                         * @returns {Boolean}
                         */
                        _is_value_element: function (el) {
                            return (
                                el instanceof HTMLInputElement ||
                                el instanceof HTMLSelectElement ||
                                el instanceof HTMLTextAreaElement ||
                                (el.getAttribute && el.getAttribute('contenteditable') === 'true')
                            );
                        },

                        /**
                         * Parses comma-separated string into trimmed array.
                         *
                         * @author TB
                         * @date 24.1.2026
                         *
                         * @param {String} csv
                         * @returns {String[]}
                         */
                        _parse_csv: function (csv) {

                            if (!csv || typeof csv !== 'string') {
                                return [];
                            }

                            return csv
                                .split(',')
                                .map((x) => x.trim())
                                .filter((x) => x.length > 0);
                        }
                    };
                },

                /**
                 * Converts value to integer with default fallback.
                 *
                 * @author TB
                 * @date 24.1.2026
                 *
                 * @param {*} value
                 * @param {Number} def
                 * @returns {Number}
                 */
                _to_int: function (value, def) {

                    const num = parseInt(value, 10);
                    if (Number.isNaN(num)) {
                        return def;
                    }

                    return num;
                }
            };

            // auto-init on DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function () {
                    window.Rowio.init();
                });
            } else {
                // already ready
                setTimeout(function () {
                    window.Rowio.init();
                }, 0);
            }

            return _instance;
        };
    })()
});
