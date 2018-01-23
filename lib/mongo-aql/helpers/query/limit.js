
var helpers = require('../../lib/query-helpers');
var utils = require('../../lib/utils');

helpers.register('limit', function(limit, values, query){
  if ( Array.isArray(limit) && limit.length === 2 && typeof limit[0] === 'number' && typeof limit[1] === 'number' ) {
    return " LIMIT " + utils.newVar(limit[0], values) + ", " + utils.newVar(limit[1], values);
  }
  else if ( typeof limit === 'number' )
    return " LIMIT " + utils.newVar(limit, values);
  else
    throw new Error('Invalid limit type `' + typeof limit  + '` for query helper `limit`. Limit must be number or \'all\'');
});
