
var queryTypes = require('../lib/query-types');

queryTypes.add( 'select', [
	'FOR'
, '{alias} {table}'
, '{where} {order} {limit} {embed} {return}'
].join(' '));

queryTypes.add('text', 'FOR {alias} IN FULLTEXT({table} {text-field} {text-search} {text-limit}) {where} {order} RETURN {alias}');

