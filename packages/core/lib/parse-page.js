const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');
const getPageOrder = require('./get-page-order');

/**
 * Parses a single documentation page, collecting the needed documentation data based on the settings in the page's Front Matter. The file is not modified in the process.
 * @param {Object} options - Spacedoc options.
 * @returns {Promise.<PageData>} Promise containing a page object.
 */
module.exports = options => filePath => {
  const file = fs.readFileSync(filePath);
  const pageData = frontMatter(file.toString());
  const pageRoot = path.join(process.cwd(), options.pages);

  /**
   * Data representation of a page. This object can be passed to `Spacedoc.build()` to render a full documentation page.
   * @typedef {Object} PageData
   * @prop {String} body - The main body of the page. This includes everything other than the Front Matter at the top. It's usually Markdown or HTML.
   * @prop {Object} meta - Original Front Matter included in the page.
   * @prop {?Number} order - Order of page within navigation.
   * @prop {String} title - Page title.
   */
  const page = {
    body: pageData.body,
    path: path.relative(pageRoot, filePath).replace(/\.md$/, '').replace(/^\d+-/, ''),
    meta: pageData.attributes,
    order: getPageOrder(filePath),
    title: pageData.attributes.title
  };

  // If there's no title...
  if (!page.title) {
    const match = pageData.body.match(/^# (.+)$/m);

    // ...try to pull it from an `<h1>` in the Markdown...
    if (match) {
      page.title = match[1];
      // And remove it from the original Markdown so we don't get two titles
      pageData.body = pageData.body.replace(match[0], '');
    } else {
      // ...or just use the page's filename
      page.title = path.basename(page.path);
    }
  }

  return page;
};
