
require('./lib/normalize');

// Register query types
require('./helpers/query-types');

// Register query helpers
require('./helpers/query/values');
require('./helpers/query/order');
require('./helpers/query/limit');
require('./helpers/query/embed');
require('./helpers/query/offset');
require('./helpers/query/alias');
require('./helpers/query/columns');
require('./helpers/query/table');
require('./helpers/query/where');
require('./helpers/query/return');
require('./helpers/query/text');

// Register conditional helpers
require('./helpers/conditional');

module.exports = require('./lib/query-builder');
module.exports.neighbors = require('./lib/query-builder-graph').neighbors;
module.exports.edge = require('./lib/query-builder-graph').edge;
