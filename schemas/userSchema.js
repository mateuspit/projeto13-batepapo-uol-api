import Joi from "joi";

// const userSchema = Joi.object({
//     username: Joi.string().required().alphanum()
// });

const userValidator = (schema) => (payload) =>
    schema.validate(payload, { abortEarly: false });

const userSchema = Joi.object({
    name: Joi.string().required()
});

export const validateUser = userValidator(userSchema);
