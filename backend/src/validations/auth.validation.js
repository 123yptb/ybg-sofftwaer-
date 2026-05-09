const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name is too short'),
    companyEmail: z.string().email('Invalid company email'),
    currencyCode: z.string().length(3).optional(),
    fullName: z.string().min(2, 'Full name is too short'),
    email: z.string().email('Invalid user email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

module.exports = { registerSchema, loginSchema };
