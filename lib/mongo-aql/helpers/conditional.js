
/**
 * Conditionals
 * TODO: update comments :/
 */

var conditionals = require('../lib/conditional-helpers');
var queryBuilder = require('../lib/query-builder');
var utils = require('../lib/utils');

/**
 * Querying where column is equal to a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be equal to
 */
conditionals.add('$equals', function(column, value, values, collection, original){
  return column + ' == ' + value;
});

conditionals.add('$eq', function(column, value, values, collection, original){
  return column + ' == ' + value;
});

/**
 * Querying where column is not equal to a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be equal to
 */
conditionals.add('$ne', function(column, value, values, collection, original){
  return column + ' != ' + value;
});

/**
 * Querying where column is greater than a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be greater than
 */
conditionals.add('$gt', function(column, value, values, collection, original){
  return column + ' > ' + value;
});

/**
 * Querying where column is greater than a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be greater than
 */
conditionals.add('$gte', function(column, value, values, collection, original){
  return column + ' >= ' + value;
});

/**
 * Querying where column is less than a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be less than
 */
conditionals.add('$lt', function(column, value, values, collection, original){
  return column + ' < ' + value;
});

/**
 * Querying where column is less than or equal to a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be lte to
 */
conditionals.add('$lte', function(column, value, values, collection, original){
  return column + ' <= ' + value;
});

/**
 * Querying where value is null
 * @param column {String}  - Column name either table.column or column
 */
conditionals.add('$null', function(column, value, values, collection, original){
  return column + ' ' + (original === false ? ' !=' : '==') + ' null';
});

/**
 * Querying where value is null
 * @param column {String}  - Column name either table.column or column
 */
conditionals.add('$notNull', function(column, value, values, collection, original){
  return column + ' ' + (original === false ? '!=' : ' ==') + ' null';
});

/**
 * Querying where column is like a value
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be like
 */
conditionals.add('$like', function(column, value, values, collection, original){
  return column + ' like ' + value;
});

/**
 * Querying where column is like a value (case insensitive)
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - What the column should be like
 */
conditionals.add('$ilike', function(column, value, values, collection, original){
  return column + ' ilike ' + value;
});

/**
 * Querying where column is in a set
 *
 * Values
 * - String, no explaination necessary
 * - Array, joins escaped values with a comma
 * - Function, executes function, expects string in correct format
 *  |- Useful for sub-queries
 *
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - String|Array|Function
 */
conditionals.add('$in', { cascade: false }, function(column, set, values, collection, original){
  if (Array.isArray(set)) {
    var a = collection + '.' + utils.newVar(column, values),
        b = utils.newVarArray(set, values);
    return '(' + a + ' IN ' + b + ')';
  }
  else {
    return '';
  }
});

conditionals.add('$inflipped', { cascade: false }, function(column, set, values, collection, original){
  return '(' + set + ' IN ' + column + ')';
});

/**
 *
 * same as $in, but the column can be an array
 *
 */
conditionals.add('$arrayin', { cascade: false }, function(column, set, values, collection, original){
  if (Array.isArray(set)) {
    var a = collection + '.' + utils.newVar(column, values),
        b = utils.newVarArray(set, values);
    return '(' + a + ' ANY IN ' + b + ')';
  }
  else {
    return '';
  }
});

/**
 * Querying where column is not in a set
 *
 * NOTE: column should be an array. Use $notin if column is a scalar value.
 *
 * Values
 * - String, no explaination necessary
 * - Array, joins escaped values with a comma
 * - Function, executes function, expects string in correct format
 *  |- Useful for sub-queries
 *
 * @param column {String}  - Column name either table.column or column
 * @param value  {Mixed}   - String|Array|Function
 */
conditionals.add('$notin', { cascade: false }, function(column, set, values, collection, original){
  if (Array.isArray(set)) {
    var a = collection + '.' + utils.newVar(column, values),
        b = utils.newVarArray(set, values);
    return '(' + a + ' NOT IN ' + b + ')';
  }
  else {
    return '';
  }
});

conditionals.add('$nin', { cascade: false }, function(column, set, values, collection, original){
  if (Array.isArray(set)) {
    var a = collection + '.' + utils.newVar(column, values),
      b = utils.newVarArray(set, values);
    return '(' + a + ' NOT IN ' + b + ')';
  }
  else {
    return '';
  }
});

/**
 * Same as $notin, but the column can be an array
 */
conditionals.add('$arraynotin', { cascade: false }, function(column, set, values, collection, original){
  if (Array.isArray(set)) {
    var a = collection + '.' + utils.newVar(column, values),
        b = utils.newVarArray(set, values);
    return '(' + a + ' NONE IN ' + b + ')';
  }
  else {
    return '';
  }
});

conditionals.add('$exists', function(column, value, values, collection, original){
  return "NOT_NULL(" + column + ")";
});
