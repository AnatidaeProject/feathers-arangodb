var
  utils   = require('./utils')
, helpers = require('./conditional-helpers')
;

module.exports = function(where, table, values){

  var buildConditions = function(where, condition, column, joiner, fields){
    joiner = joiner || ' && ';
    fields = fields || [];

    // if (column) {
    //   column = utils.quoteObject(column, table);
    // }

    var conditions = [], result;

    for (var key in where) {

      // If the value is null, send a $null helper through the condition builder
      if ( where[key] === null ) {
        var tmp = {};
        tmp[key] = { $null: key == '$ne'? false: true };
        conditions.push( buildConditions(tmp, condition, column, joiner) );
        continue;
      }

      if (typeof where[key] == 'object' && !(where[key] instanceof Date) && !Buffer.isBuffer(where[key])) {

        // Key is conditional block
        if (helpers.has(key)) {
          // If it cascades, run it through the builder using the helper key
          // as the current condition
          // If it doesn't cascade, run the helper immediately
          if (helpers.get(key).options.cascade)
            (result = buildConditions(where[key], key, column, joiner, fields)) && conditions.push(result);
          else
            (result = helpers.get(key).fn(column, where[key], values, table, where[key])) && conditions.push(result);
        }

        // Key is Joiner
        else if (key == '$or')
          (result = buildConditions(where[key], condition, column, ' || ', fields)) && conditions.push(result);
        else if (key == '$and')
          (result = buildConditions(where[key], condition, column, ' && ', fields)) && conditions.push(result);

        // Key is array index
        else if (+key >= 0)
          (result = buildConditions(where[key], condition, column, joiner, fields)) && conditions.push(result);

        // Key is column
        else {
          // (result = buildConditions(where[key], condition, key, joiner, fields.concat(key))) && conditions.push(result);
          (result = buildConditions(where[key], condition, key, null, fields.concat(key))) && conditions.push(result);
        }

        continue;
      }

      // A little hack to handle $exists separately
      // todo: maybe try to figure out how in the normal "helper" block
      if (key === '$exists') {

        var col, val = null;

        if (fields.length) {
          col = table + '.' + utils.newVar(fields, values);
        }
        else if (column) {
          col = table + '.' + utils.newVar(column, values);
        }

        if (where[key]) {
          if (!col) {
            col = table;
          }

          col += '.' + utils.parameterize(where[key], values, false);
        }

        conditions.push(
          helpers.get(key).fn(
            col
          , val
          , values
          , table
          , where[key]
          )
        );
      }
      // Key is a helper, use that for this value
      else if (helpers.has(key)) {
        conditions.push(
          helpers.get(key).fn(
            table + '.' + (fields.length? utils.newVar(fields, values): utils.newVar(column, values))
          , utils.parameterize(where[key], values, true)
          , values
          , table
          , where[key]
          )
        );
      }

      // Key is an array index
      else if (+key >= 0) {

        conditions.push(
          helpers.get(condition).fn(
            table + '.' + (fields.length? utils.newVar(fields, values): utils.newVar(column, values))
          , utils.parameterize(where[key], values, true)
          , values
          , table
          , where[key]
          )
        );

      }

      // Key is a column
      else {

        conditions.push(
          helpers.get(condition).fn(
            table + (fields.length? '.' + utils.newVar(fields, values): '') + '.' + utils.parameterize(key, values)
          , utils.parameterize(where[key], values, true)
          , values
          , table
          , where[key]
          )
        );

      }
    }

    if (conditions.length > 1) return '(' + conditions.join(joiner) + ')';
    if (conditions.length == 1) return conditions[0];
  };

  // Always remove outer-most parenthesis
  var result = buildConditions(where, '$equals');
  if (!result) return '';
  if (result[0] == '(') return result.substring(1, result.length - 1);
  return result;
};
