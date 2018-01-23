
var utils = module.exports = {};
var regs = {
  dereferenceOperators: /[-#=]+>+/g
, endsInCast: /::\w+$/
};

utils.newVar = function(value, values, prefix, dontSplitValue) {
  prefix = prefix || '';

  if (Array.isArray(value)) {
    res = [];
    for (var i = 0; i < value.length; i++) {
      res.push(utils.newVar(value[i], values, prefix));
    }

    return res.join('.');
  }
  else {
    var varname = prefix + 'v' + Object.keys(values).length;
    values[varname] = !dontSplitValue && typeof value === 'string' && value.indexOf('.') !== -1? value.split('.'): value;

    return '@' + varname;
  }
}

utils.newVarTable = function(value, values, prefix, dontSplitValue) {
  prefix = prefix || '';

  var varname = prefix + '@v' + Object.keys(values).length;
  values[varname] = !dontSplitValue && typeof value === 'string' && value.indexOf('.') !== -1? value.split('.'): value;

  return '@' + varname;
}

utils.newVarArray = function(value, values, prefix) {
  prefix = prefix || '';

  var varname = prefix + 'v' + Object.keys(values).length;
  values[varname] = value;

  return '@' + varname;
}

utils.parameterize = function(value, values, dontSplitValue) {
  if (typeof value == 'boolean') return value ? 'true' : 'false';
  if (value[0] != '@') return utils.newVar(value, values, undefined, dontSplitValue);
  if (value[value.length - 1] != '@') return values.push(value);
  return utils.quoteObject(value.substring(1, value.length - 1));
};

utils.quoteColumn = utils.quoteObject = function(field, collection){
  var period;
  var rest = Array.prototype.slice.call( arguments, 1 );
  var split;

  // Wierdly on phantomjs Number.isNaN is undefined
  // FIXME: find the root cause
  var checkIsNaN = Number.isNaN || isNaN;

  // Split up database and/or schema definition
  for(var i=0;i<rest.length;++i) {
    if(rest[i].indexOf('.')) {
      split = rest[i].split('.');
      rest.splice(i,1);
      split.forEach(function(s) {
        rest.splice(i,0,s);
      });
    }
  }

  // They're casting
  if ( regs.endsInCast.test( field ) ){
    return utils.quoteObject.apply(
      null
    , [ field.replace( regs.endsInCast, '' ) ].concat( rest )
    ) + field.match( regs.endsInCast )[0];
  }

  // They're using JSON/Hstore operators
  if ( regs.dereferenceOperators.test( field ) ){
    var operators = field.match( regs.dereferenceOperators );

    // Split on operators
    return field.split(
      regs.dereferenceOperators
    // Properly quote each part
    ).map( function( part, i ){
      if ( i === 0 ) return utils.quoteObject.apply( null, [ part ].concat( rest ) );

      if ( checkIsNaN( parseInt( part ) ) && part.indexOf("'") === -1 ){
        return "'" + part + "'";
      }

      return part;
    // Re-join fields and operators
    }).reduce( function( a, b, i ){
      return [ a, b ].join( operators[ i - 1 ] );
    });
  }

  // Just using *, no collection
  if (field.indexOf('*') === 0 && collection)
    return '"' + (rest.reverse()).join('"."') + '".*';

  // Using *, specified collection, used quotes
  else if (field.indexOf('".*') > -1)
    return field;

  // Using *, specified collection, didn't use quotes
  else if (field.indexOf('.*') > -1)
    return '"' + field.split('.')[0] + '".*';

  // No periods specified in field, use explicit `table[, schema[, database] ]`
  else if (field.indexOf('.') === -1)
    return ( rest.reverse() ).concat( field.replace( /\"/g, '' ) ).join('.');

  // Otherwise, a `.` was in there, just quote whatever was specified
  else
    return field.replace( /\"/g, '' ).split('.').join('.');
};

utils.quoteValue = function(value){
  var num = parseInt(value), isNum = (typeof num == 'number' && (num < 0 || num > 0));
  return isNum ? value : "$$" + value + "$$";
};

/**
 * Returns a function that when called, will call the
 * passed in function with a specific set of arguments
 */
utils.with = function(fn){
  var args = Array.prototype.slice.call(arguments, 1);
  return function(){ fn.apply({}, args); };
};
