'use strict';

const { validationResult } = require('express-validator');

/**
 * Middleware: collect express-validator errors and return 400 if any exist.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'One or more query parameters are invalid',
      details: errors.array().map((e) => ({ param: e.path, msg: e.msg, value: e.value })),
    });
  }
  next();
}

module.exports = { handleValidationErrors };
