const Joi = require('joi');

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        next();
    };
};

const schemas = {
    login: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
    }),

    createUser: Joi.object({
        username: Joi.string().min(3).max(30).required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid('Admin', 'Accountant', 'Viewer').required()
    }),

    createTransaction: Joi.object({
        date: Joi.date().required(),
        description: Joi.string().required(),
        amount: Joi.number().positive().required(),
        type: Joi.string().valid('income', 'expense').required(),
        scope: Joi.string().valid('personal', 'business').required(),
        category_id: Joi.number().integer().optional().allow(null),
        source: Joi.string().optional().allow(null, '')
    }),

    updateTransaction: Joi.object({
        date: Joi.date().optional(),
        description: Joi.string().optional(),
        amount: Joi.number().positive().optional(),
        type: Joi.string().valid('income', 'expense').optional(),
        scope: Joi.string().valid('personal', 'business').optional(),
        category_id: Joi.number().integer().optional().allow(null),
        status: Joi.string().valid('pending', 'confirmed').optional()
    }),

    createCategory: Joi.object({
        name: Joi.string().required(),
        scope: Joi.string().valid('personal', 'business', 'both').required()
    })
};

module.exports = { validate, schemas };
