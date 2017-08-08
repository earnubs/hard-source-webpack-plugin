var medea = require('medea');

var path = '/Users/stephenstewart/Workspace/hard-source-webpack-plugin/tests/fixtures/plugin-html-lodash/tmp/cache/module';
var key = '/Users/stephenstewart/Workspace/hard-source-webpack-plugin/node_modules/lodash/lodash.js';

var db = medea();

db.open(path, function() {
  db.get(key, function(err, value) {
    if (err) console.log('error!', err);
    console.log(value.toString().slice(0,20));
    // get() value is truncated, JSON.parse then fails
    console.log(value.toString().slice(-20));
  });
});
