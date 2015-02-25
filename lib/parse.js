var async   = require('async');
var css     = require('css');
var exec    = require('child_process').exec;
var glob    = require('glob');
var jsdoc   = require('jsdoc3-parser');
var path    = require('path');
var rimraf  = require('rimraf');
var sass    = require('node-sass');
var sassdoc = require('sassdoc');

// Parses files according to the options passed to the constructor.
module.exports = function(cb) {
  var _this = this;
  var tasks = {
    // Hologram
    hologram: function(callback) {
      var holo = path.join(__dirname, '../adapters/hologram/hologram.rb');
      exec('ruby '+holo+' '+_this.options.html, function(error, stdout, stderr) {
        callback(error, JSON.parse(stdout));
      });
    },
    // SassDoc
    sassdoc: function(callback) {
      sassdoc.parse(_this.options.sass, {verbose: true}).then(function(data) {
        callback(null, data);
      });
    },
    // JSDoc
    jsdoc: function(callback) {
      glob(_this.options.js, function(er, files) {
        var data = [];
        for (var file in files) {
          jsdoc(files[file], function(error, ast) {
            for (var item in ast) data.push(ast[item]);
          });
        }
        callback(null, data);
      });
    },
    // CSS classes
    css: function(callback) {
      // glob('scss/**/*.scss', function(err, files) {
      //   var data = {};
      //   for (var file in files) {
      //     sass.render({
      //       file: files[file],
      //       includePaths: ['./scss'],
      //       outputStyle: 'nested',
      //       success: function(data, map, status) {
      //         var name = files[file].split('/');
      //         name = name[name.length -1].split
      //         data[]
      //       },
      //       error: function() {
      //         callback(new Error('Error with node-sass.'), {});
      //       }
      //     });
      //   }
      //   callback(null, data);
      // });
      callback(null, {});
    }
  };

  async.parallel(tasks, function(err, results) {
    cb(results);
  });
}