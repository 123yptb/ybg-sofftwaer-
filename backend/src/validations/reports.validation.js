const { z } = require('zod');

const dateRangeSchema = z.object({
  query: z.object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD'),
    toDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD'),
  }).refine(d => new Date(d.toDate) >= new Date(d.fromDate), {
    message:  'toDate must be on or after fromDate',
    path:     ['toDate'],
  }),
});

const asOfDateSchema = z.object({
  query: z.object({
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'asOfDate must be YYYY-MM-DD'),
  }),
});

const glDetailSchema = z.object({
  params: z.object({
    accountId: z.string().uuid('Invalid account ID'),
  }),
  query: z.object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD'),
    toDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD'),
  }),
});

module.exports = { dateRangeSchema, asOfDateSchema, glDetailSchema };
