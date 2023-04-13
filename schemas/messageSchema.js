import Joi from "joi";

const messageValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false });

const messageSchema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.valid('message', 'private_message'),
    from: Joi.string()
});

export const validateMessage = messageValidator(messageSchema);