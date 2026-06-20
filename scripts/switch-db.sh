#!/bin/bash
# 切换数据库配置
#
# 使用方式：
#   ./scripts/switch-db.sh sqlite   # 切换到 SQLite（开发环境）
#   ./scripts/switch-db.sh postgresql  # 切换到 PostgreSQL（生产环境）

set -e

DB_TYPE=${1:-sqlite}

echo "═══════════════════════════════════════════════════════════"
echo "  Switch Database: $DB_TYPE"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$DB_TYPE" = "postgresql" ]; then
  # 切换到 PostgreSQL
  echo "─── Switching to PostgreSQL ───────────────────────────"

  # 备份当前 schema
  cp prisma/schema.prisma prisma/schema.sqlite.backup

  # 修改 provider
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

  echo "✅ Schema updated to PostgreSQL"
  echo ""
  echo "  Next steps:"
  echo "  1. Set DATABASE_URL in .env:"
  echo "     DATABASE_URL=\"postgresql://user:pass@localhost:5432/coworker\""
  echo "  2. Run: npx prisma db push"
  echo "  3. Run: npx prisma generate"

elif [ "$DB_TYPE" = "sqlite" ]; then
  # 切换到 SQLite
  echo "─── Switching to SQLite ──────────────────────────────"

  # 恢复 schema
  if [ -f prisma/schema.sqlite.backup ]; then
    cp prisma/schema.sqlite.backup prisma/schema.prisma
  else
    sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
  fi

  echo "✅ Schema updated to SQLite"
  echo ""
  echo "  Next steps:"
  echo "  1. Set DATABASE_URL in .env:"
  echo "     DATABASE_URL=\"file:./dev.db\""
  echo "  2. Run: npx prisma db push"
  echo "  3. Run: npx prisma generate"

else
  echo "❌ Unknown database type: $DB_TYPE"
  echo "   Use: sqlite or postgresql"
  exit 1
fi
