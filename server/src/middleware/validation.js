const Joi = require('joi');

const clientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().min(10).max(15).pattern(/^[+]?[0-9\s\-\(\)]+$/),
  birthDate: Joi.date().iso().max('now').optional(),
  address: Joi.object({
    street: Joi.string().trim().max(200),
    city: Joi.string().trim().max(100),
    state: Joi.string().trim().max(50),
    zipCode: Joi.string().trim().max(20),
    country: Joi.string().trim().max(50)
  }).optional()
});

const clientUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().trim().min(10).max(15).pattern(/^[+]?[0-9\s\-\(\)]+$/).optional(),
  birthDate: Joi.date().iso().max('now').optional(),
  address: Joi.object({
    street: Joi.string().trim().max(200),
    city: Joi.string().trim().max(100),
    state: Joi.string().trim().max(50),
    zipCode: Joi.string().trim().max(20),
    country: Joi.string().trim().max(50)
  }).optional()
});

const validateClient = (req, res, next) => {
  const { error } = clientSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  next();
};

const validateClientUpdate = (req, res, next) => {
  const { error } = clientUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  next();
};

const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      error: 'Invalid ID format'
    });
  }
  next();
};

module.exports = {
  validateClient,
  validateClientUpdate,
  validateObjectId
};