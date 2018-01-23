var helpers = require('../../lib/query-helpers');
var utils = require('../../lib/utils');

helpers.register('order', function(order, values, query){
  if (typeof order !== 'object') {
    throw new Error('Invalid orderby type `' + typeof limit  + '` - it should bean object');
  }

  var output = "SORT ";

  for (var key in order) {
    output += query.__defaultTable + '.' + utils.newVar(key, values) + ' ' + (order[key] === 1? 'ASC': 'DESC') + ', ';
  }

  if (output === "SORT ") return "";

  return output.substring(0, output.length - 2);
});
