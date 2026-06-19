# Scripts 端到端测试指南

## 概述

本目录包含运行时执行系统的脚本，用于测试任务调度、执行和验证流程。

## 脚本说明

| 脚本 | 用途 | 依赖 |
|------|------|------|
| `runtime-seed-sample-job.ts` | 创建示例任务 | taskId |
| `runtime-run-once.ts` | 执行一次任务调度 | jobId, workerId, mode |
| `runtime-verify-once.ts` | 验证任务执行结果 | jobId, workerId |

## 端到端测试流程

### 步骤 1：启动开发服务器

```bash
cd D:\AI编程\产品自研\AI 生产系统\coworker-a2a
npm run dev
```

### 步骤 2：初始化数据库（首次运行）

```bash
npx prisma db push
npx prisma db seed
```

### 步骤 3：创建示例任务

```bash
# 创建一个示例任务
npx tsx scripts/runtime-seed-sample-job.ts \
  --taskId="test-task-001" \
  --createdBy="test-user" \
  --workerHint="worker-dev-1"
```

**预期输出：**
```json
{
  "jobId": "xxx",
  "workerId": "worker-dev-1",
  "status": "created"
}
```

### 步骤 4：执行任务调度（Dry Run 模式）

```bash
# 使用上一步返回的 jobId 和 workerId
npx tsx scripts/runtime-run-once.ts \
  --jobId="<jobId>" \
  --workerId="<workerId>" \
  --mode=dry_run
```

**预期输出：**
```json
{
  "ok": true,
  "jobId": "xxx",
  "status": "completed",
  "receipt": { ... },
  "safetyNote": "..."
}
```

### 步骤 5：验证执行结果

```bash
# 使用相同的 jobId 和 workerId
npx tsx scripts/runtime-verify-once.ts \
  --jobId="<jobId>" \
  --workerId="<workerId>"
```

**预期输出：**
```json
{
  "ok": true,
  "jobId": "xxx",
  "verification": { ... }
}
```

### 步骤 6：执行真实任务（可选）

```bash
# 使用 obsidian_write 模式执行真实任务
npx tsx scripts/runtime-run-once.ts \
  --jobId="<jobId>" \
  --workerId="<workerId>" \
  --mode=obsidian_write \
  --execute=true \
  --vaultPath="D:/path/to/vault"
```

## 完整测试脚本

创建一个 `test-e2e.sh` 文件：

```bash
#!/bin/bash
set -e

echo "=== 步骤 1: 启动开发服务器 ==="
npm run dev &
sleep 5

echo "=== 步骤 2: 初始化数据库 ==="
npx prisma db push

echo "=== 步骤 3: 创建示例任务 ==="
SEED_OUTPUT=$(npx tsx scripts/runtime-seed-sample-job.ts \
  --taskId="e2e-test-$(date +%s)" \
  --createdBy="e2e-test" \
  --workerHint="worker-test-1")

echo "$SEED_OUTPUT"

JOB_ID=$(echo "$SEED_OUTPUT" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
WORKER_ID=$(echo "$SEED_OUTPUT" | grep -o '"workerId":"[^"]*"' | cut -d'"' -f4)

echo "=== 步骤 4: 执行 Dry Run ==="
npx tsx scripts/runtime-run-once.ts \
  --jobId="$JOB_ID" \
  --workerId="$WORKER_ID" \
  --mode=dry_run

echo "=== 步骤 5: 验证结果 ==="
npx tsx scripts/runtime-verify-once.ts \
  --jobId="$JOB_ID" \
  --workerId="$WORKER_ID"

echo "=== 测试完成 ==="
kill %1 2>/dev/null || true
```

## 故障排查

### 常见错误

1. **数据库连接失败**
   ```bash
   # 检查 .env 文件中的 DATABASE_URL
   cat .env | grep DATABASE_URL
   
   # 重新初始化数据库
   npx prisma db push
   ```

2. **JobId 不存在**
   ```bash
   # 先创建示例任务
   npx tsx scripts/runtime-seed-sample-job.ts --taskId="test-123"
   ```

3. **权限错误**
   ```bash
   # 检查 vaultPath 是否存在且可写
   ls -la <vaultPath>
   ```

## 参数说明

### runtime-seed-sample-job.ts

| 参数 | 必填 | 说明 |
|------|------|------|
| `--taskId` | ✅ | 任务 ID |
| `--createdBy` | ❌ | 创建者名称（默认: system） |
| `--workerHint` | ❌ | Worker 提示（默认: worker-dev-1） |
| `--vaultPath` | ❌ | Obsidian Vault 路径 |

### runtime-run-once.ts

| 参数 | 必填 | 说明 |
|------|------|------|
| `--jobId` | ✅ | 任务 ID |
| `--workerId` | ✅ | Worker ID |
| `--mode` | ✅ | 执行模式: `dry_run` 或 `obsidian_write` |
| `--execute` | ❌ | 是否执行（默认: false） |
| `--vaultPath` | ❌ | Obsidian Vault 路径 |

### runtime-verify-once.ts

| 参数 | 必填 | 说明 |
|------|------|------|
| `--jobId` | ✅ | 任务 ID |
| `--workerId` | ✅ | Worker ID |
| `--leaseDurationMs` | ❌ | 租约持续时间（毫秒） |
