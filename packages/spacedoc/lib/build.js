const findDoclets = require('./util/findDoclets');
const helpers = require('spacedoc-helpers');
const yaml = require('js-yaml');

/**
 * Create an HTML page out of a documentation object.
 * @param {PageData} data - Page object generated by `Spacedoc.parse()`.
 * @returns {String} Rendered HTML string.
 * @todo Return `null` if there's an error, and have `init()` respond to it by not writing the page to disk.
 * @todo Rename `data` param to `page`.
 */
module.exports = function build(data = {}) {
  /**
   * Locals passed to a Pug template.
   * @typedef {Object} PageLocals
   * @prop {PageData} page - Page-specific data (includes doclets, page title, page body, etc.)
   * @prop {Object} site - Site-wide data.
   * @prop {PageData[]} site.pages - Complete list of pages.
   * @prop {Object} spacedoc - Spacedoc helper functions and metadata. Includes all functions in the spacedoc-helpers package.
   * @prop {PageFindFunction} spacedoc.find - Used to look up doclets attached to the current page.
   * @prop {Object} spacedoc.adapters - List of loaded adapters.
   * @prop {Object} theme - Theme-specific settings.
   */
  const locals = {
    page: data,
    site: {
      pages: this.tree,
    },
    spacedoc: Object.assign({
      find: findDoclets(data.docs),
      adapters: this.adapters,
    }, helpers),
    theme: this.options.themeOptions,
  };

  // Render to HTML
  try {
    const output = this.theme.compileString(locals, data.meta.layout);

    // Preserve Front Matter if configured to
    if (this.options.keepFm) {
      return `---\n${yaml.safeDump(data.meta)}\n---\n\n${output}`;
    }

    return output;
  }
  catch (e) {
    console.log(`Got this error while parsing ${data.originalName}:`);
    console.log(e);
    return '';
  }
}
