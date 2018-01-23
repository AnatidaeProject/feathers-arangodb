
var helpers = require('../../lib/query-helpers'),
	utils = require('../../lib/utils');

helpers.register('embed', function(embed, values, query) {
	res = ''

	if (embed && embed.length) {
		for (var i = 0; i < embed.length; i++) {
			embed[i].cname = 'c' + i;
			embed[i].key = utils.newVar(embed[i].key, values);
			res += 'LET ' + embed[i].cname + ' = DOCUMENT(' + utils.newVar(embed[i].collection, values, '@') + ', ' + query.__defaultTable + '.' + embed[i].key +') ';
		}	
	}

	return res;
});

