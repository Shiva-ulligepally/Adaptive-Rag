// /api/index.js
// Vercel serverless function entrypoint using a CommonJS wrapper and dynamic import()
// to cleanly bridge the ES Modules backend without transpilation or ESM conflicts.

module.exports = async (req, res) => {
  const appModule = await import("../backend/server.js");
  const app = appModule.default || appModule;
  return app(req, res);
};
