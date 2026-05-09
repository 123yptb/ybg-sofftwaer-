const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  try {
    // Parse synchronous for zod validation
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    // Collect all Zod validation errors and format into a readable message
    const errorMessage = err.errors.map((details) => details.message).join(', ');
    return next(new ApiError(400, errorMessage));
  }
};

module.exports = validate;
