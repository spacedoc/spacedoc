const File = require('vinyl');
const findIndex = require('lodash.findindex');
const frontMatter = require('front-matter');
const fs = require('fs');
const hljs = require('highlight.js');
const path = require('path');
const processFilePath = require('./util/processFilePath');
const pug = require('pug');
const replaceBase = require('replace-basename');
const replaceExt = require('replace-ext');
const transformLinks = require('transform-markdown-links');
const yamlComment = require('./util/yamlComment');

/**
 * Parses a single documentation page, collecting the needed documentation data based on the settings in the page's Front Matter. The file is not modified in the process.
 *
 * @example <caption>Use without Gulp. A Vinyl file must be created manually.</caption>
 * const File = require('vinyl');
 * fs.readFile('page.html', (err, contents) => {
 *   const page = new File({
 *     path: 'page.html',
 *     contents: contents
 *   });
 *   Spacedoc.parse(page).then(data => {
 *     // data is an object
 *   })
 * })
 *
 * @param {(Vinyl|String)} file - File to parse, or a path to a file to parse.
 * @param {InitOptions} opts - Extra parsing options.
 * @returns {Promise.<PageData>} Promise containing raw page data.
 * @todo Make definition of page object more clear.
 * @todo Make file I/O asynchronous.
 * @todo Consider not putting the entire contents of the page Front Matter in the top-level page metadata. (Risk of property conflicts.)
 * @todo Make into a pure function.
 */
module.exports = function parse(file, opts = {}) {
  // If a string path is passed instead of a Vinyl file, create a new file from the string
  if (typeof file === 'string') {
    try {
      file = new File({
        path: file,
        contents: fs.readFileSync(file)
      });
    }
    catch (e) {
      return new Promise((resolve, reject) => reject(new Error(`Spacedoc.parse(): error loading file ${file}`)));
    }
  }

  // Don't process directories
  if (file.isDirectory()) return Promise.resolve();

  const extension = path.extname(file.path);
  const contents = yamlComment(file.contents.toString(), extension);
  const pageData = frontMatter(contents, extension);

  /**
   * Data representation of a page. This object can be passed to `Spacedoc.build()` to render a full documentation page.
   * @typedef {Object} PageData
   * @prop {Object} _frontMatter - Original Front Matter included in the page.
   * @prop {String} body - The main body of the page. This includes everything other than the Front Matter at the top. It's usually Markdown or HTML.
   * @prop {Object.<String, Object>} docs - Documentation data. Each key is the name of an adapter, such as `sass` or `js`, and each value is the data that adapter found.
   * @prop {String} fileName - Final path to the page, relative to the root page, which is defined by `options.pageRoot`.
   * @prop {String} group - Group the page is in.
   * @prop {?String} layout - Template layout to use. `default` is set if a page doesn't define this.
   * @prop {String} originalName - Path to the page as originally given to the parser.
   * @prop {String} title - Page title.
   */
  const page = Object.assign({}, pageData.attributes, {
    _frontMatter: Object.assign({}, pageData.attributes),
    body: '',
    docs: pageData.attributes.docs || {},
    fileName: processFilePath(file.path, this.options.pageRoot, this.options.extension),
    group: pageData.attributes.group || null,
    originalName: file.path,
  });

  // If there's no title...
  if (!page.title) {
    // ...try to pull it from an `<h1>` in the Markdown...
    if (path.extname(page.originalName) === '.md') {
      const h1RegExp = /^# (.+)$/m;
      page.title = pageData.body.match(h1RegExp)[1];
      // And remove it from the original Markdown so we don't get two titles
      pageData.body = pageData.body.replace(h1RegExp, '');
    }
    // ...or just use the page's filename
    else {
      const ext = path.extname(page.fileName);
      page.title = path.basename(page.fileName, ext);
    }
  }

  // Render as Markdown for .md files
  if (this.options.markdown && path.extname(page.originalName) === '.md') {
    try {
      // Replace links to `.md` files with `.html`
      const markdown = transformLinks(pageData.body, link => {
        if (path.extname(link) === '.md') {
          return replaceExt(link, '.html');
        }
      });
      page.body = this.options.markdown.render(markdown);
      page.fileName = replaceExt(page.fileName, '.html');
    }
    catch (e) {
      return Promise.reject(new Error(`Markdown error: ${e.message}`));
    }
  }
  // Render as Pug for .pug files
  else if (path.extname(page.originalName) === '.pug') {
    page.body = pug.render(pageData.body);
    page.fileName = replaceExt(page.fileName, '.html');
  }
  // Everything else keep as-is
  else {
    page.body = pageData.body;
  }

  // When all adapter data has been collected, add it to the page object
  return this.parseDocs(page.docs).then(results => {
    for (let res of results) {
      page.docs[res.adapter] = res.data;
    }

    // For complete builds, push all pages to the tree
    if (!opts.incremental) {
      this.tree.push(page);
    }
    // For incremental builds, we have to figure out if the page already exists in the tree or not
    else {
      // Look for a page in the tree with a matching filename
      const key = findIndex(this.tree, { fileName: page.fileName });

      // If that page exists, we replace the existing page with the revised one
      if (key > -1) {
        this.tree[key] = page;
      }
      // Otherwise, we add the new page to the end of the tree
      else {
        this.tree.push(page);
      }
    }

    return page;
  }).catch(err => {
    console.log(err);
  });
}
