import app from '../src/index.js';

// Vercel Serverless Function entry.
// All requests are rewritten to this function via vercel.json,
// and the Express app handles routing internally (/api/v1/*).
export default app;
