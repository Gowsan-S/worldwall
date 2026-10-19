// Vercel Serverless Function Entrypoint
// Directly forwards incoming serverless HTTP requests to the Express application
const app = require('../server/index');

module.exports = app;
