/**
 * Vercel Serverless Function 入口
 * Root Directory = server，api/index.ts 引用同项目内的 src/index.js（在 Root Directory 内部，NFT 可靠追踪）
 * src/index.ts 已导出 default app（Express 实例），且 VERCEL=1 时不启动本地端口监听
 */
import app from '../src/index.js';

export default app;
