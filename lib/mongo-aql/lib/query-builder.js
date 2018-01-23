
var queryTypes = require('./query-types');
var queryHelpers = require('./query-helpers');
var utils = require('./utils');

module.exports = function(collection, json) {
	var query;

	if (typeof collection !== 'string' || !collection || !collection.length) {
		throw new Error('collection empty or not a string.')
	}

	if (typeof json === undefined || !json) {
		throw new Error('json empty.')
	}

	if (typeof json === undefined || !json) {
		throw new Error('json empty.')
	}

	if (Object.prototype.toString.call(json) !== "[object Object]") {
		throw new Error('input not a valid object.')
	}

	// create a clone of the object which we can then modify
	// and thus leave the original object intact
	json = Object.assign({}, json);

	if (typeof json === 'string') {
		try {
			json = JSON.parse(json);
		}
		catch (err) {
			throw new Error(err);
			return err;
		}
	}

	if (!json) {
		return '';
	}

	// todo: separate these into functions
	if (json.$text) {
		query = {
			type: 'text',
			table: collection,
			alias: 'c',
		};

		// grab certain keywords that need to be in their separate objects
		for (var key in json.$text) {
			if (key === '$search') {
				query['text-search'] = json.$text[key];
				delete json.$text[key];
			}
			else if (key === '$field') {
				query['text-field'] = json.$text[key];
				delete json.$text[key];
			}
			else if (key === '$limit') {
				query['text-limit'] = json.$text[key];
				delete json.$text[key];
			}
		}

		delete json.$text;

		for (var key in json) {
			if (key === '$orderby') {
				query['order'] = json[key];
				delete json[key];
			}
		}

		// the rest belongs to "where"
		query.where = json;
	}
	else {
		query = {
			type: 'select',
			table: collection,
			alias: 'c',
			return: true
		};

		// grab certain keywords that need to be in their separate objects
		for (var key in json) {
			if (key === '$orderby') {
				query['order'] = json[key];
				delete json[key];
			}
			else if (key === '$limit') {
				if (typeof json['$skip'] !== 'undefined') {
					query['limit'] = [ json['$skip'], json[key] ];
					delete json['$skip'];
				}
				else {
					query['limit'] = json[key];
				}

				delete json[key];
			}
			else if (key.substring(0, 1) === '@') {
				query.embed = query.embed || [];
				query.embed.push({ key: key.substring(1), collection: json[key] });
				delete json[key];
			}
		}

		// the rest belongs to "where"
		query.where = json;
	}

	return build(query);
}

/**
 * Main AQL Building function
 * @param  {Object} query
 * @param  {Array}  values
 * @return {String}
 */
function build(query, values) {
	if (!query.type){
		query.type = 'expression';
	} else if (!queryTypes.has(query.type)){
		query.function = query.type;
		query.type = 'function';
	}

	var
		type      = queryTypes.get(query.type)
	, variables = type.match(/\{[\w-]+\}/g);

	values    = values || {};
	query.__defaultTable = query.table;
	query.columns = ['*'];

	for (var i = 0, l = variables.length, key; i < l; ++i){
		// If there exists a builder function and input in the options
		// corresponding to the query helper name, then run that
		// helper function with the value of the query->helper_key
		type = type.replace(
			variables[i]
		, queryHelpers.has(key = variables[i].substring(1, variables[i].length - 1)) && query[key] ?
			queryHelpers.get(key).fn(query[key], values, query) : ''
		);
	}

	var result = {
		query :   type.trim().replace(/\s+/g, " ")
	, values:   values
	};

	// console.log(result);
	return result;
};
