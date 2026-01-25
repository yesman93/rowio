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
 * - Rowio does NOT sanitize JSON prefill values
 * - WYSIWYG/editor init is handled by userland listeners (Rowio only emits events)
 *
 * Naming convention (required for reindex + harvesting):
 *   prefix__field__0
 *   prefix__field__1
 *   ...
 *
 *   Where:
 *   - prefix = data-rowio-prefix on wrapper
 *   - field  = field name
 *   - 0,1,... = row index
 *
 *   Example:
 *   data-rowio-prefix="invoice-items"
 *   name="invoice-items__description__0"
 *   name="invoice-items__amount__0"
 *   name="invoice-items__description__1"
 *   name="invoice-items__amount__1"
 */
Object.defineProperty(window, 'Rowio', {

    /**
     * Prevents reconfiguration of the 'Rowio' property on window
     *
     * @type {Boolean}
     */
    configurable: false,

    /**
     * Prevents enumeration of the 'Rowio' property on window
     *
     * @type {Boolean}
     */
    enumerable: false,

    /**
     * Lazy singleton getter for Rowio
     *
     * @returns {Object} Rowio singleton instance
     */
    get: (function () {

        let _instance = null;

        return function () {

            if (_instance) {
                return _instance;
            }

            _instance = {

                /**
                 * Rowio instances registry
                 *
                 * @type {Object}
                 */
                instances: {},

                /**
                 * Normalize target into an array of wrapper elements
                 *
                 * @param target
                 *
                 * @returns {Array} Array of HTMLElements
                 *
                 * @private
                 */
                _normalize_wrappers: function (target) {

                    let elements = [];

                    // No target provided, look for all elements with .rowio class
                    if (typeof target === 'undefined' || target === null) {

                        elements = Array.from(document.querySelectorAll('.rowio'))
                            .filter( element => element instanceof HTMLElement ); // Keep only HTMLElements

                        // Remove duplicates
                        return Array.from(new Set(elements));
                    }

                    // Target is a CSS selector, find all matching elements
                    if (typeof target === 'string') {

                        elements = Array.from(document.querySelectorAll(target))
                            .filter( element => element instanceof HTMLElement) // Keep only HTMLElements
                            .filter( element => element.classList.contains('rowio') ); // Keep only .rowio elements

                        // Remove duplicates
                        return Array.from(new Set(elements));
                    }

                    // Target is single HTMLElement
                    if (target instanceof HTMLElement) {

                        elements = [target]
                            .filter( element => element.classList.contains('rowio') ); // Keep only .rowio elements

                        return elements;
                    }

                    // Target is multiple HTMLElements, sanitize the list
                    if (Array.isArray(target) || target instanceof NodeList || target instanceof HTMLCollection) {

                        elements = Array.from(target)
                            .filter( element => element instanceof HTMLElement ) // Keep only HTMLElements
                            .filter( element => element.classList.contains('rowio') ); // Keep only .rowio elements

                        // Remove duplicates
                        return Array.from(new Set(elements));
                    }

                    return [];
                },

                /**
                 * Convert given value to integer, return default if conversion fails or value is negative
                 *
                 * @param value
                 * @param default_value
                 *
                 * @returns {Number}
                 *
                 * @private
                 */
                _to_int: function (value, default_value) {

                    const number = parseInt(value, 10);
                    if (Number.isNaN(number) || number < 0) {
                        return default_value;
                    }

                    return number;
                },

                /**
                 * Create a Rowio instance for given wrapper element
                 *
                 * @param {HTMLElement} wrapper
                 *
                 * @returns {Object} Rowio instance object or null on failure
                 *
                 * @private
                 */
                _create_instance: function (wrapper) {

                    if (!wrapper || !(wrapper instanceof HTMLElement)) {
                        return null;
                    }

                    const template = wrapper.querySelector('template.rowio-template');
                    if (!template) {
                        console.error('Rowio instance creation failed: No template found in wrapper', wrapper);
                        return null;
                    }

                    let rows_container = wrapper.querySelector('.rowio-rows');
                    if (!rows_container) {

                        rows_container = document.createElement('div');
                        rows_container.classList.add('rowio-rows');

                        template.insertAdjacentElement('afterend', rows_container);

                        console.info('Rowio: Created missing .rowio-rows container in wrapper', wrapper);
                    }

                    const prefix = (wrapper.dataset.rowioPrefix || '').trim();
                    const shown = this._to_int(wrapper.dataset.rowioShown, 1);
                    const max = this._to_int(wrapper.dataset.rowioMax, 0); // 0 = unlimited
                    const copy_down = (wrapper.dataset.rowioCopyDown || '').trim();
                    const class_btn_copy_down = (wrapper.dataset.rowioCopyDownClass || '').trim();

                    const override_key = (template.dataset.rowioKey || '').trim();
                    const key = override_key.length ? override_key : prefix;

                    console.log(override_key, prefix, key);

                    if (!key.length) {
                        console.error('Rowio instance creation failed: No key defined for instance in wrapper', wrapper);
                        return null;
                    }

                    return {

                        /**
                         * Unique key of the Rowio instance
                         *
                         * @type {String}
                         */
                        key: key,

                        /**
                         * Prefix for input names
                         *
                         * @type {String}
                         */
                        prefix: prefix,

                        /**
                         * Wrapper element
                         *
                         * @type {HTMLElement}
                         */
                        wrapper: wrapper,

                        /**
                         * Template element
                         *
                         * @type {HTMLTemplateElement}
                         */
                        template: template,

                        /**
                         * Rows container element
                         *
                         * @type {HTMLElement}
                         */
                        rows_container: rows_container,

                        /**
                         * Number of rows to show initially
                         *
                         * @type {Number}
                         */
                        shown: shown,

                        /**
                         * Maximum number of rows allowed (0 = unlimited)
                         *
                         * @type {Number}
                         */
                        max: max,

                        /**
                         * Copy down selector
                         *
                         * @type {String}
                         */
                        copy_down: copy_down,

                        /**
                         * Override key for the instance (if any)
                         *
                         * @type {String}
                         */
                        override_key: override_key,

                        /**
                         * Copy down button class
                         *
                         * @type {String}
                         */
                        class_btn_copy_down: class_btn_copy_down,

                        /**
                         * Template row clone
                         *
                         * @type {HTMLElement|null}
                         */
                        _template_row: null,

                        /**
                         * Prefill data for the instance
                         *
                         * @type {Array|null}
                         */
                        _prefill_data: null,

                        /**
                         * Initialize the Rowio instance
                         *
                         * @return {void}
                         *
                         * @private
                         */
                        _init: function () {

                            // Reading
                            this._cache_template_row();
                            this._read_prefill_data();

                            // Building
                            this._ensure_override_hidden();
                            this._bind_events();
                            this._render_initial_rows();
                            this._setup_copy_down_controls();

                            // Let the world know we're ready
                            this._emit_event('rowio:ready', {
                                instance: this,
                                rows_count: this.get_rows_count(),
                                rows: this._get_rows(),
                            });
                        },

                        /**
                         * Ensure override hidden input exists in the wrapper if override key is defined
                         *
                         * @return {void}
                         *
                         * @private
                         */
                        _ensure_override_hidden: function () {

                            if (!this.override_key.length) {
                                console.info('Rowio instance override hidden not needed: No override key defined for instance', this);
                                return;
                            }

                            if (!this.prefix.length) {
                                console.error('Rowio instance override hidden creation failed: No prefix defined for instance', this);
                                return;
                            }

                            const name = '__rowio_key__' + this.prefix;

                            if (this.wrapper.querySelector(`input[type="hidden"][name="${CSS.escape(name)}"]`)) {
                                return;
                            }

                            const input = document.createElement('input');
                            input.type = 'hidden';
                            input.id = name;
                            input.name = name;
                            input.value = this.override_key;

                            this.wrapper.appendChild(input);
                        },

                        /**
                         * Cache template row element for future cloning
                         *
                         * @return {void}
                         *
                         * @private
                         */
                        _cache_template_row: function () {

                            const content = this.template.content;
                            if (!content) {
                                console.error('Rowio instance template row caching failed: No content in template', this);
                                return;
                            }

                            const row = content.querySelector('.rowio-row');
                            if (!row) {
                                console.error('Rowio instance template row caching failed: No .rowio-row found in template content', this);
                                return;
                            }

                            this._template_row = row;
                        },

                        /**
                         * Read prefill data from template script tag and its content parsed as JSON
                         *
                         * @return {void}
                         *
                         * @private
                         */
                        _read_prefill_data: function () {

                            const script = this.template.content
                                ? this.template.content.querySelector('script.rowio-data[type="application/json"]')
                                : null;

                            if (!script) {
                                console.info('Rowio instance prefill data not found: No script.rowio-data found in template', this);
                                this._prefill_data = null;
                                return;
                            }

                            const raw_data = (script.textContent || '').trim();
                            if (!raw_data.length) {
                                console.info('Rowio instance prefill data not found in template (no valid content)', this);
                                this._prefill_data = null;
                                return;
                            }

                            try {
                                const parsed = JSON.parse(raw_data);
                                this._prefill_data = Array.isArray(parsed) ? parsed : null;
                            } catch (e) {
                                console.error('Rowio instance prefill data parsing failed: Invalid JSON in script.rowio-data', this, e);
                                this._prefill_data = null;
                            }
                        },

                        /**
                         * Bind events to the instance wrapper
                         *
                         * @return {void}
                         *
                         * @private
                         */
                        _bind_events: function () {

                            // Bind only once per instance
                            if (this.wrapper.dataset.rowioEventsBound === '1') {
                                return;
                            }

                            this.wrapper.dataset.rowioEventsBound = '1';

                            this.wrapper.addEventListener('click', e => {

                                // Add a new row
                                const btn_add = e.target.closest('.rowio-add');
                                if (btn_add && this.wrapper.contains(btn_add)) {

                                    e.preventDefault();

                                    this.add_row(null);
                                    this._setup_copy_down_controls();

                                    return;
                                }

                                // Remove a row
                                const btn_remove = e.target.closest('.rowio-remove');
                                if (btn_remove && this.wrapper.contains(btn_remove)) {

                                    e.preventDefault();

                                    const row = btn_remove.closest('.rowio-row');
                                    if (row) {
                                        this.remove_row(row);
                                    }

                                    return;
                                }

                                // Copy down value
                                const btn_copy_down = e.target.closest('.rowio-copy-down');
                                if (btn_copy_down && this.wrapper.contains(btn_copy_down)) {

                                    e.preventDefault();

                                    const field = (btn_copy_down.dataset.rowioField || '').trim();
                                    const row = btn_copy_down.closest('.rowio-row');

                                    if (field.length && row) {
                                        this._copy_down(field, row);
                                    }
                                }
                            });
                        },

                        /**
                         * Add a new row
                         *
                         * @param {Object|null} data
                         *
                         * @returns {Node|null}
                         */
                        add_row: function (data) {

                            if (this.max > 0 && this.get_rows_count() >= this.max) {
                                console.info('Rowio instance add_row: Maximum number of rows reached', this);
                                return null;
                            }

                            const row = this._clone_template_row();
                            if (!row) {
                                // Eventual errors already logged in _clone_template_row()
                                return null;
                            }

                            this.rows_container.appendChild(row);

                            // Always reindex (names/ids/for)
                            this._reindex_rows();

                            // Apply default values and/or prefill data
                            if (data && typeof data === 'object') {
                                this._prefill_row_from_data(row, data);
                            } else {
                                this._apply_default_values(row);
                            }

                            const index = this._get_row_index(row);

                            this._emit_event('rowio:row-add', this._make_payload(row, index));
                            this._emit_event('rowio:change', this._make_payload(row, index));

                            return row;
                        },

                        /**
                         * Remove given row
                         *
                         * @param {HTMLElement} row
                         *
                         * @returns {void}
                         */
                        remove_row: function (row) {

                            if (!row || !(row instanceof HTMLElement)) {
                                console.error('Rowio instance remove_row: Invalid row element', this);
                                return;
                            }

                            const rows = this._get_rows();
                            if (!rows.length) {
                                console.error('Rowio instance remove_row: No rows found in instance', this);
                                return;
                            }

                            // Always keep at least 1 row
                            if (rows.length <= 1) {
                                console.info('Rowio instance remove_row: At least one row must remain', this);
                                return;
                            }

                            const index = this._get_row_index(row);

                            row.remove();

                            // Reindex remaining rows
                            this._reindex_rows();

                            // Emit events
                            this._emit_event('rowio:row-remove', {
                                instance: this,
                                row: null,
                                index: index,
                                fields: {},
                                editors: []
                            });
                            this._emit_event('rowio:change', {
                                instance: this,
                                row: null,
                                index: index,
                                fields: {},
                                editors: []
                            });

                            // Copy down controls need to exist on first visible row - re-setup them
                            this._setup_copy_down_controls();
                        },

                        /**
                         * Get all rows as an array
                         *
                         * @returns {Array} Array of HTMLElements
                         *
                         * @private
                         */
                        _get_rows: function () {
                            return Array.from(this.rows_container.querySelectorAll('.rowio-row'));
                        },

                        /**
                         * Get all rows count
                         *
                         * @returns {number}
                         */
                        get_rows_count: function () {
                            return this._get_rows().length;
                        },

                        /**
                         * Clone template row node
                         *
                         * @returns {Node|null}
                         *
                         * @private
                         */
                        _clone_template_row: function () {

                            if (!this._template_row) {
                                console.error('Rowio row clone: No template row', this);
                                return null;
                            }

                            const row = this._template_row.cloneNode(true);

                            // Ensure it's an element
                            if (!(row instanceof HTMLElement)) {
                                console.error('Rowio row clone: Cloned node is not an HTMLElement', this);
                                return null;
                            }

                            return row;
                        },

                        /**
                         * Reindex all rows in the instance (names, ids, for attributes)
                         *
                         * @returns {void}
                         *
                         * @private
                         */
                        _reindex_rows: function () {

                            const rows = this._get_rows();
                            if (!rows.length) {
                                console.info('Rowio instance reindex: No rows found in template', this);
                                return;
                            }

                            rows.forEach( (row, new_index) => {

                                const elements = this._get_row_field_elements(row);

                                // Update fields inside row
                                elements.forEach( element => {

                                    const name = (element.getAttribute('name') || '').trim();
                                    const id = (element.getAttribute('id') || '').trim();

                                    // Update name
                                    if (name.length) {

                                        let new_name;

                                        const parsed = this._parse_key(name);
                                        if (parsed) {
                                            new_name = `${parsed.prefix}__${parsed.field}__${new_index}`;
                                        } else {
                                            new_name = `${this.prefix}__${name}__${new_index}`;
                                        }
                                        element.setAttribute('name', new_name);
                                    }

                                    // Update id
                                    if (id.length) {

                                        const old_id = id;
                                        let new_id;

                                        const parsed = this._parse_key(id);
                                        if (parsed) {
                                            new_id = `${parsed.prefix}__${parsed.field}__${new_index}`;
                                        } else {
                                            new_id = `${this.prefix}__${id}__${new_index}`;
                                        }

                                        element.setAttribute('id', new_id);

                                        // Update labels inside row that reference this id
                                        row.querySelectorAll(`label[for="${CSS.escape(old_id)}"]`).forEach( label => {
                                            label.setAttribute('for', new_id);
                                        });
                                    }
                                });
                            });
                        },

                        /**
                         * Get all field elements (value carriers) inside given row
                         *
                         * @param {HTMLElement} row
                         *
                         * @returns {Array}
                         *
                         * @private
                         */
                        _get_row_field_elements: function (row) {

                            if (!row || !(row instanceof HTMLElement)) {
                                return [];
                            }

                            return Array.from(row.querySelectorAll('input, select, textarea, [contenteditable="true"]'));
                        },

                        /**
                         * Parse the given key into components (prefix, field, index)
                         *
                         * @param {String} key
                         *
                         * @returns {{prefix: string, field: string, index: number}|null} Parsed key object or null on failure
                         *
                         * @private
                         */
                        _parse_key: function (key) {

                            if (!key || typeof key !== 'string' || !key.length) {
                                return null;
                            }

                            // Fast precheck
                            const pos = key.indexOf('__');
                            if (pos <= 0) {
                                console.error('Rowio key parse: Invalid key format (no __ found)', key);
                                return null;
                            }

                            const parts = key.split('__');
                            if (parts.length !== 3) {
                                console.error(`Rowio key parse: Invalid key format (expected 3 parts, got ${parts.length})`, key);
                                return null;
                            }

                            const prefix = parts[0];
                            const field = parts[1];
                            const index_raw = parts[2];

                            if (!prefix.length || !field.length) {
                                console.error('Rowio key parse: Invalid key format (empty prefix or field)', key);
                                return null;
                            }

                            const index = parseInt(index_raw, 10);
                            if (Number.isNaN(index)) {
                                console.error('Rowio key parse: Invalid key format (index is not a number)', key);
                                return null;
                            }

                            return {
                                prefix: prefix,
                                field: field,
                                index: index
                            };
                        },

                        /**
                         * Check if given element is a value carrier (input, select, textarea, contenteditable)
                         *
                         * @param {any} element
                         *
                         * @returns {Boolean}
                         *
                         * @private
                         */
                        _is_value_element: function (element) {

                            return (
                                element instanceof HTMLInputElement ||
                                element instanceof HTMLSelectElement ||
                                element instanceof HTMLTextAreaElement ||
                                (element.getAttribute && element.getAttribute('contenteditable') === 'true')
                            );
                        },

                        /**
                         * Write given value into given element
                         *
                         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLElement} element
                         * @param {any} value
                         *
                         * @private
                         */
                        _write_value: function (element, value) {

                            if (!element) {
                                console.warn('Rowio write: No element found in template', this);
                                return;
                            }

                            // Normalize undefined/null
                            if (typeof value === 'undefined' || value === null) {
                                value = '';
                            }

                            // Input element
                            if (element instanceof HTMLInputElement) {

                                if (element.type === 'checkbox') {
                                    element.checked = (value === 1 || value === '1' || value === true);
                                } else if (element.type === 'radio') {
                                    element.checked = (element.value === value);
                                } else {
                                    element.value = value;
                                }

                                element.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                            }

                            // Select element
                            if (element instanceof HTMLSelectElement) {

                                if (element.multiple) {

                                    const values = Array.isArray(value)
                                        ? value.map( v => String(v) )
                                        : (
                                            typeof value === 'string'
                                            ? value.split(',').map( v => v.trim() )
                                            : []
                                        );

                                    Array.from(element.options).forEach( option => {
                                        option.selected = values.includes(option.value);
                                    });

                                } else {

                                    let selected = false;
                                    Array.from(element.options).forEach( option => {

                                        if (String(value) === option.value) {
                                            option.selected = true;
                                            selected = true;
                                        } else {
                                            option.selected = false;
                                        }
                                    });

                                    // If nothing is selected, select the first option
                                    if (!selected && element.options.length) {
                                        element.selectedIndex = 0;
                                    }
                                }

                                element.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                            }

                            // Textarea element
                            if (element instanceof HTMLTextAreaElement) {

                                element.value = value;

                                element.dispatchEvent(new Event('change', { bubbles: true }));
                                return;
                            }

                            // Contenteditable element
                            if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {

                                const allow_html = (element.dataset && element.dataset.rowioHtml === '1')
                                    || (element.dataset && element.dataset.rowioHtml === 'true');

                                if (allow_html) {
                                    element.innerHTML = value;
                                } else {
                                    element.textContent = value;
                                }

                                element.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        },

                        /**
                         * Apply default values to all fields in given row
                         *
                         * @param {HTMLElement} row
                         *
                         * @private
                         */
                        _apply_default_values: function (row) {

                            const elements = this._get_row_field_elements(row);

                            elements.forEach( element => {

                                const default_value = (element.dataset.rowioDefault || '').toString();

                                // If no default value, clear inputs
                                if (!default_value.length) {

                                    if (this._is_value_element(element)) {
                                        this._write_value(element, '');
                                    }

                                    return;
                                }

                                this._write_value(element, default_value);
                            });
                        },

                        /**
                         * Prefill given row from given data object
                         *
                         * @param {HTMLElement} row
                         * @param {Object} data
                         *
                         * @private
                         */
                        _prefill_row_from_data: function (row, data) {

                            // First apply defaults
                            this._apply_default_values(row);

                            const payload = this._make_payload(row, this._get_row_index(row));

                            Object.keys(data).forEach( key => {

                                if (!payload.fields[key]) {
                                    return;
                                }

                                const field = payload.fields[key];
                                const targets = Array.isArray(field) ? field : [field];

                                targets.forEach( target => {
                                    this._write_value(target, data[key]);
                                });
                            });
                        },

                        /**
                         * Create event payload object
                         *
                         * @param {HTMLElement} row
                         * @param {Number} index
                         *
                         * @returns {{instance: *, row: *, index: *, fields: {}, editors: *[]}} Event payload object
                         *
                         * @private
                         */
                        _make_payload: function (row, index) {

                            const fields = {};
                            const editors = [];

                            if (row && row instanceof HTMLElement) {

                                const elements = this._get_row_field_elements(row);

                                elements.forEach( element => {

                                    // Editor candidates
                                    if (element.classList && element.classList.contains('wysiwyg-editor')) {
                                        editors.push(element);
                                    }
                                    if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {
                                        editors.push(element);
                                    }

                                    const name = (element.getAttribute('name') || '').trim();
                                    const id = (element.getAttribute('id') || '').trim();

                                    const parsed = this._parse_key(name.length ? name : id);
                                    if (!parsed) {
                                        return;
                                    }

                                    const field_name = parsed.field;

                                    if (typeof fields[field_name] === 'undefined') {
                                        fields[field_name] = element; // First occurrence
                                    } else if (Array.isArray(fields[field_name])) {
                                        fields[field_name].push(element); // Third+ occurrence
                                    } else {
                                        fields[field_name] = [fields[field_name], element]; // Second occurrence
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
                         * Get index of given row
                         *
                         * @param {HTMLElement} row
                         *
                         * @returns {Number|null}
                         *
                         * @private
                         */
                        _get_row_index: function (row) {

                            const elements = this._get_row_field_elements(row);

                            for (let i = 0; i < elements.length; i += 1) {

                                const name = (elements[i].getAttribute('name') || '').trim();
                                const id = (elements[i].getAttribute('id') || '').trim();

                                const parsed = this._parse_key(name.length ? name : id);
                                if (parsed) {
                                    return parsed.index;
                                }
                            }

                            // Fallback: get from DOM position
                            const rows = this._get_rows();
                            const pos = rows.indexOf(row);

                            return pos >= 0 ? pos : null;
                        },

                        /**
                         * Emit event with given name and payload from the wrapper
                         *
                         * @param {String} name
                         * @param {Object} payload
                         *
                         * @private
                         */
                        _emit_event: function (name, payload) {

                            const event = new CustomEvent(name, {
                                bubbles: true,
                                cancelable: false,
                                detail: payload
                            });

                            this.wrapper.dispatchEvent(event);
                        },

                        /**
                         * Set up copy down controls for the instance
                         *
                         * @returns {void}
                         *
                         * @private
                         */
                        _setup_copy_down_controls: function () {

                            // Remove existing controls to avoid duplicates
                            this.wrapper.querySelectorAll('.rowio-copy-down')
                                            .forEach( element => element.remove());

                            const field_names = this._parse_csv(this.copy_down);
                            if (!field_names.length) {
                                console.info('Rowio instance copydown setup: No field names defined for copydown', this);
                                return;
                            }

                            const rows = this._get_rows();
                            if (!rows.length) {
                                console.info('Rowio instance copydown setup: No rows found in instance', this);
                                return;
                            }

                            const first_row = rows[0];
                            const payload = this._make_payload(first_row, 0);

                            field_names.forEach( field_name => {

                                const field = payload.fields[field_name] ? payload.fields[field_name] : null;
                                const element = Array.isArray(field) ? field[0] : field;

                                if (!element) {
                                    return;
                                }

                                // Create button next to the input (simple and framework-agnostic)
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = `rowio-copy-down ${this.class_btn_copy_down}`;
                                btn.dataset.rowioField = field_name;
                                btn.innerHTML = '↓';

                                // insert right after element
                                element.insertAdjacentElement('afterend', btn);
                            });
                        },

                        /**
                         * Parse comma-separated values string into array
                         *
                         * @param {String} csv
                         *
                         * @returns {Array} Array of trimmed non-empty strings
                         *
                         * @private
                         */
                        _parse_csv: function (csv) {

                            if (!csv || typeof csv !== 'string') {
                                return [];
                            }

                            return csv
                                .split(',')
                                .map( chunk => chunk.trim() )
                                .filter( chunk => chunk.length > 0);
                        },

                        /**
                         * Copy down value from given field in given source row to same field in all subsequent rows
                         *
                         * @param {String} field_name
                         * @param {HTMLElement} source_row
                         *
                         * @private
                         */
                        _copy_down: function (field_name, source_row) {

                            if (!field_name || typeof field_name !== 'string' || !field_name.length) {
                                console.error('Rowio instance copy down: Invalid field name', this);
                                return;
                            }

                            if (!source_row || !(source_row instanceof HTMLElement)) {
                                console.error('Rowio instance copy down: Invalid source row element', this);
                                return;
                            }

                            const rows = this._get_rows();
                            if (!rows.length) {
                                console.info('Rowio instance copy down: No rows found in instance', this);
                                return;
                            }

                            const source_index = this._get_row_index(source_row);
                            if (source_index === null) {
                                console.error('Rowio instance copy down: Source row index could not be determined', this);
                                return;
                            }

                            const source_payload = this._make_payload(source_row, source_index);
                            const source_field = source_payload.fields[field_name] ? source_payload.fields[field_name] : null;
                            const source_element = Array.isArray(source_field) ? source_field[0] : source_field;

                            if (!source_element) {
                                console.error('Rowio instance copy down: Source field element not found in source row', this);
                                return;
                            }

                            const source_value = this._read_value(source_element);

                            // Apply to next rows only
                            for (let i = source_index + 1; i < rows.length; i++) {

                                const row = rows[i];
                                const payload = this._make_payload(row, i);
                                const field = payload.fields[field_name] ? payload.fields[field_name] : null;

                                if (!field) {
                                    console.warn(`Rowio instance copy down: No field element found in target row index ${i}`, this);
                                    continue;
                                }

                                const targets = Array.isArray(field) ? field : [field];
                                targets.forEach((target) => {
                                    this._write_value(target, source_value);
                                });
                            }

                            this._emit_event('rowio:copy-down', this._make_payload(source_row, source_index));
                            this._emit_event('rowio:change', this._make_payload(source_row, source_index));
                        },

                        /**
                         * Read value from given element
                         *
                         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|HTMLElement} element
                         *
                         * @returns {Number|String}
                         *
                         * @private
                         */
                        _read_value: function (element) {

                            if (!element) {
                                return '';
                            }

                            // Input element
                            if (element instanceof HTMLInputElement) {

                                if (element.type === 'checkbox') {
                                    return element.checked ? 1 : 0;
                                }

                                if (element.type === 'radio') {
                                    return element.checked ? element.value : '';
                                }

                                return element.value;
                            }

                            // Select element
                            if (element instanceof HTMLSelectElement) {
                                return element.value;
                            }

                            // Textarea element
                            if (element instanceof HTMLTextAreaElement) {
                                return element.value;
                            }

                            // Contenteditable element
                            if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {

                                const allow_html = (element.dataset && element.dataset.rowioHtml === '1')
                                    || (element.dataset && element.dataset.rowioHtml === 'true');

                                return allow_html ? element.innerHTML : element.textContent;
                            }

                            return '';
                        },

                        /**
                         * Render initial rows based on prefill data or shown count
                         *
                         * @return {void}
                         *
                         * @private
                         */
                        _render_initial_rows: function () {

                            // Clear any existing rows
                            this.rows_container.innerHTML = '';

                            if (this._prefill_data && this._prefill_data.length) {

                                if (this.max > 0 && this._prefill_data.length > this.max) {
                                    console.warn('Rowio instance initial render: Prefill data length exceeds max rows, truncating', this);
                                }

                                // Respect maximum
                                const limit = (this.max > 0)
                                    ? Math.min(this._prefill_data.length, this.max)
                                    : this._prefill_data.length;

                                // Add rows with prefill data
                                for (let i = 0; i < limit; i++) {
                                    this.add_row(this._prefill_data[i]);
                                }

                                return;
                            }

                            // Fallback to shown count (minimum is always 1)
                            const count = Math.max(1, this.shown);
                            for (let i = 0; i < count; i++) {
                                this.add_row(null);
                            }
                        },

                    };
                },

                /**
                 * Initialize Rowio instance on given target or multiple targets
                 *
                 * @param {String|Array|HTMLElement|NodeList|HTMLCollection|null|undefined} target
                 *
                 * @returns {void}
                 */
                init: function (target = undefined) {

                    const wrappers = this._normalize_wrappers(target);
                    if (!wrappers.length) {
                        console.error('No wrappers found for Rowio initialization');
                        return;
                    }

                    wrappers.forEach( wrapper => {

                        if (wrapper.dataset.rowioInitialized === '1') {
                            return;
                        }

                        const instance = this._create_instance(wrapper);
                        if (!instance) {
                            return;
                        }

                        this.instances[instance.key] = instance;
                        wrapper.dataset.rowioInitialized = '1';

                        instance._init();
                    });

                },

            };

            return _instance;
        }

    })()

});


