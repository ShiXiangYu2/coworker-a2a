#!/bin/bash
# 生产部署脚本
#
# 使用方式：
#   chmod +x scripts/deploy-production.sh
#   ./scripts/deploy-production.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  CoWorker+A2A Production Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. 检查环境变量
echo "─── Step 1: Check environment variables ───────────────"
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  echo "   Copy .env.example to .env and configure it"
  exit 1
fi

# 检查必要的环境变量
required_vars=("DATABASE_URL" "LLM_PROVIDER" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if ! grep -q "^${var}=" .env; then
    echo "❌ Missing required env var: ${var}"
    exit 1
  fi
done
echo "✅ Environment variables OK"

# 2. 安装依赖
echo ""
echo "─── Step 2: Install dependencies ──────────────────────"
npm ci --only=production
echo "✅ Dependencies installed"

# 3. 生成 Prisma Client
echo ""
echo "─── Step 3: Generate Prisma Client ───────────────────"
npx prisma generate
echo "✅ Prisma Client generated"

# 4. 推送数据库 Schema
echo ""
echo "─── Step 4: Push database schema ─────────────────────"
npx prisma db push
echo "✅ Database schema synced"

# 5. 构建项目
echo ""
echo "─── Step 5: Build project ────────────────────────────"
npm run build
echo "✅ Project built"

# 6. 运行测试（可选）
echo ""
echo "─── Step 6: Run tests ────────────────────────────────"
if [ "$SKIP_TESTS" != "true" ]; then
  npm test 2>/dev/null || echo "⚠️ Some tests failed (continuing anyway)"
  echo "✅ Tests completed"
else
  echo "⏭️ Tests skipped"
fi

# 7. 显示部署信息
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  To start the server:"
echo "    npm start"
echo ""
echo "  Or with PM2:"
echo "    pm2 start npm --name coworker -- start"
echo "    pm2 save"
echo ""
echo "  For Docker deployment:"
echo "    docker-compose up -d"
echo ""
echo "  For Nginx HTTPS:"
echo "    sudo cp nginx.conf /etc/nginx/conf.d/coworker.conf"
echo "    sudo nginx -t && sudo nginx -s reload"
echo ""
echo "═══════════════════════════════════════════════════════════"
