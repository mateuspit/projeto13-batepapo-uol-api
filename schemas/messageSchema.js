import Joi from "joi";

const messageValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false });

const messageSchema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.valid('message', 'private_message').required(),
    from: Joi.string().required(),
    time: Joi.string().pattern(/^([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9])$/)
});

export const validateMessage = messageValidator(messageSchema);