function Spacedoc() {
  this.options = {};
  this.adapters = {};
  this.tree = [];
  this.template = null;
}

Spacedoc.prototype.init = require('./lib/init');
Spacedoc.prototype.parse = require('./lib/parse');
Spacedoc.prototype.parseDocs = require('./lib/parseDocs');
Spacedoc.prototype.build = require('./lib/build');
Spacedoc.prototype.addAdapter = require('./lib/addAdapter');
Spacedoc.prototype.config = require('./lib/config');
Spacedoc.prototype.buildSearch = require('./lib/buildSearch');

module.exports = new Spacedoc();
module.exports.Spacedoc = Spacedoc;
