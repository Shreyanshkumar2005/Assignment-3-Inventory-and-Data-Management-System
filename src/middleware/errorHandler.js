// 404 Handler for undefined routes
const notFound = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with invalid id format: ${err.value}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((val) => val.message);
    message = `Validation Error: ${errors.join(', ')}`;
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    const duplicatedValue = err.keyValue ? err.keyValue[duplicatedField] : '';
    message = `Duplicate value '${duplicatedValue}' for unique field '${duplicatedField}'. Product with this ${duplicatedField} already exists.`;
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler
};
