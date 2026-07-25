const { validationResult } = require("express-validator");

/**
 * Run after express-validator chains. Returns 400 with first error message.
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array({ onlyFirstError: true })[0];
    return res.status(400).json({
      success: false,
      message: first?.msg || "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = validateRequest;
