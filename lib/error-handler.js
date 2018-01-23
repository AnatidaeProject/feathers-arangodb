const errors = require('@feathersjs/errors');

module.exports = function errorHandler (error) {
  // NOTE (EK): The list of error code is way too massive to map
  // them to a specific error object so we'll use a generic one.
  // See https://docs.feathersjs.com/api/errors.html

  if (error.name === 'ArangoError') {
    throw new errors.GeneralError(error, {
      ok: error.ok,
      code: error.code
    });
  }

  throw error;
};
