
var helpers = require('../../lib/query-helpers');
var utils = require('../../lib/utils');

helpers.register('text-field', function (val, values) {
  return ', ' + utils.newVar(val, values, undefined, true);
});

helpers.register('text-limit', function (val, values) {
  return ', ' + utils.newVar(val, values);
});

helpers.register('text-search', function (val, values) {
  return ', ' + utils.newVar(val, values, '', true);
});
