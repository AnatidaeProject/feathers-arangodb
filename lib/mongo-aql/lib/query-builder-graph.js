var utils = require('./utils');
var queryHelpers = require('./query-helpers');

/*
** Very simple implementation. Expand later.
*/

var direction = {
	outbound: 'OUTBOUND',
	inbound: 'INBOUND',
	any: 'ANY'
};

function checkGraphName(s) {
	var re = /^[a-z][a-z0-9_-]{0,63}$/i;

	if (!s || !re.test(s)) throw new Error('mongo-aql: Invalid graph name: ' + s);
}

function checkVertexExample(s) {
	var re = /^[a-z][a-z0-9_-]{0,63}\/[a-z0-9_:.@()+,=;$!*'%-]{1,255}$/i;

	if (typeof s === 'string' && !re.test(s)) throw new Error('mongo-aql: Invalid vertex example: ' + s);
}

function returnQuery(options) {
	var res = {
		start: 'p.vertices[0]',
		end: 'p.vertices[1]'
	}

	return ' RETURN { d: ' + (res[options.returnvertex] || 'v') + '._key, v: 1, type: "http://sharejs.org/types/JSONv0", data: e }';
}

module.exports.edge = function(graphName, from, to, edgeExample, options) {
	checkGraphName(graphName);

	// default direction is outbound because from -> to implies outbound
	var values = { graphName: graphName, from: from },
		query = 'FOR v, e, p in ' + (direction[options.direction] || direction.outbound) + ' @from GRAPH @graphName FILTER p.vertices[1]._id == ' + utils.newVar(to, values);

	// add edge filters
	if (edgeExample) {
		for (var i in edgeExample) {
			query += ' AND p.edges[0].' + utils.newVar(i, values) + ' == ' + utils.newVar(edgeExample[i], values, '', true);
		}
	}

	query += returnQuery(options);

	var result = {
		query :   query,
		values:   values
	};

	return result;
}

module.exports.neighbors = function(graphName, vertexExample, edgeExample, options) {
	checkGraphName(graphName);
	checkVertexExample(vertexExample);

	if (edgeExample) {
		var query = 'FOR v, e, p in ' + (direction[options.direction] || direction.any) + ' @vertexExample GRAPH @graphName FILTER p.vertices[1] != null ',
			values = { graphName: graphName, vertexExample: vertexExample };

		// add edge filters

		for (var i in edgeExample) {
			query += ' AND p.edges[0].' + utils.newVar(i, values) + ' == ' + utils.newVar(edgeExample[i], values, '', true);
		}

		if (options.$limit) {
			query += 'LIMIT ';

			if (typeof options.$skip !== 'undefined') {
				query += options.$skip + ',';
			}

			query += options.$limit + ' ';
		}

		query += returnQuery(options);
	}
	else {
		var query = 'FOR v, e, p in ' + (direction[options.direction] || direction.any) + ' @vertexExample GRAPH @graphName FILTER p.vertices[1] != null ',
			values = { graphName: graphName, vertexExample: vertexExample };

		if (options.$orderby) {
			query += queryHelpers.get('order').fn(options.$orderby, values, { __defaultTable: 'e' });
		}

		if (options.$limit) {
			query += ' LIMIT ';

			if (typeof options.$skip !== 'undefined') {
				query += options.$skip + ',';
			}

			query += options.$limit + ' ';
		}

		query += returnQuery(options);
	}

	var result = {
		query  :   query,
		values :   values
	};

	return result;
}

