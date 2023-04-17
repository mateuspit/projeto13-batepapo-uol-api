import Joi from "joi";

const userValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false });

const userSchema = Joi.object({
    name: Joi.string().insensitive().required()
});

export const validateUser = userValidator(userSchema);
