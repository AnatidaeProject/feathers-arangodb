
var helpers = require('../../lib/query-helpers');

helpers.register('return', function(embed, values, query) {
	var embed = query.embed;
	res = 'RETURN '

	if (embed && embed.length) {
		res += 'MERGE(' + query.__defaultTable;

		for (var i = 0; i < embed.length; i++) {
			res += ', { ' + embed[i].key + ': ' + embed[i].cname + ' }';
		}	
		res += ')';
	}
	else {
		res += query.__defaultTable;
	}

	return res;
});
