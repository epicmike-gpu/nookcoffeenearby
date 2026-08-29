#!/bin/bash
# Vercel 单项目构建脚本：构建 Expo Web 前端到 client/dist
# 后端无需构建（api/index.ts 由 Vercel 自动编译为 Serverless Function）
set -e

cd client
pnpm exec expo export --platform web
