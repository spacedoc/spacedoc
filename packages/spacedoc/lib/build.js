const filter = require('lodash.filter');
const fromPairs = require('lodash.frompairs');
const path = require('path');
const yaml = require('js-yaml');
const helpers = require('spacedoc-helpers');

/**
 * Create an HTML page out of a documentation object.
 * @param {PageData} data - Page object generated by `Spacedoc.parse()`.
 * @throws Will throw an error if no template was set with `Spacedoc.config()`.
 * @throws Will throw an error if the template encounters an error while rendering.
 * @returns {String} Rendered HTML string.
 */
module.exports = function build(data = {}) {
  // Render a template with the component's data and write it to disk
  let output = '';

  if (data.layout && !this.multiTemplate) {
    console.warn(`Spacedoc: alternate layouts cannot be used if only a single template was passed to Spacedoc.config(). (Layout set by ${data.fileName})`);
  }

  // Use a page-defined layout or the default one
  const layout = this.multiTemplate ? (data.layout || 'default') : 'default';

  // Construct object of locals to drop into Pug template
  const locals = Object.assign({}, this.options.data, {
    // Page-specific data (includes doclets, page title, page body, etc.)
    page: data,
    // Site-wide data, includes list of pages and template-defined globals
    site: Object.assign({}, this.options.site, {
      pages: this.tree,
    }),
    // Spacedoc helpers, includes Lodash's filter function, the list of adapters, and the contents of the spacedoc-helpers package
    spacedoc: Object.assign({
      /**
       * Find a doclet within a specific adapter's data set.
       * @param {String} scope - Adapter data to search in.
       * @param {*} predicate - Argument to pass to `lodash.filter`.
       * @returns {?Object[]} List of doclets, or `undefined` if none were found.
       */
      find: (scope, predicate = {}) => {
        if (scope in data.docs) {
          return filter(data.docs[scope], predicate);
        }
        return [];
      },
      adapters: this.adapters,
    }, helpers),
  });

  // Render the set layout
  if (layout in this.templates) {
    // Manually catch template errors, because Gulp won't display them
    try {
      output = this.templates[layout](locals);
    }
    catch (e) {
      console.warn('Spacedoc.build(): ', e);
    }
  }
  else {
    console.warn(`Spacedoc.build(): no layout called ${layout} exists. (Set by ${data.fileName})`);
  }

  // Preserve Front Matter if configured to
  if (this.options.keepFm) {
    output = `---\n${yaml.safeDump(data._frontMatter)}\n---\n\n${output}` ;
  }

  return output;
}
