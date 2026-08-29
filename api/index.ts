import app from "../server/src/index.js";

// Vercel Serverless 入口：把 Express app 作为函数 handler
// 所有 /api/* 请求通过 vercel.json 的 rewrites 转发到这里
export default app;
