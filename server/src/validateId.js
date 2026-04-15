// Middleware to validate that :id (and other common numeric params) are integers.
// Prevents string/injection values from reaching SQLite and causing connection resets.

export function validateNumericParams(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value !== undefined && !/^\d+$/.test(value)) {
        return res.status(400).json({ error: `Invalid ${name}: must be a numeric ID` });
      }
    }
    next();
  };
}

// Convenience: validate just :id
export const validateId = validateNumericParams('id');

// Validate :id and :actionId (for CCR actions)
export const validateIdAndAction = validateNumericParams('id', 'actionId');
