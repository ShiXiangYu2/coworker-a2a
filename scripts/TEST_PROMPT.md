# 优化后的端到端测试提示词

## 提示词 1：基础测试

```
请帮我执行以下端到端测试流程：

1. 首先检查 scripts 目录下的三个脚本是否正常工作
2. 创建一个示例任务（使用 runtime-seed-sample-job.ts）
3. 执行 dry_run 模式测试（使用 runtime-run-once.ts）
4. 验证执行结果（使用 runtime-verify-once.ts）

测试数据要求：
- taskId: 使用时间戳生成唯一 ID，格式: e2e-test-{timestamp}
- workerId: worker-dev-1
- mode: dry_run

请按顺序执行每个步骤，并输出每个步骤的结果。
```

## 提示词 2：完整流程测试

```
请帮我完成运行时执行系统的完整端到端测试：

## 测试目标
验证从任务创建到执行验证的完整流程

## 测试步骤

### 第一步：环境检查
- 检查数据库连接是否正常
- 检查 scripts 目录下的脚本是否存在

### 第二步：创建测试任务
执行命令：
npx tsx scripts/runtime-seed-sample-job.ts --taskId="e2e-test-$(date +%s)" --createdBy="test-automation" --workerHint="worker-test-1"

### 第三步：执行 Dry Run
使用上一步返回的 jobId 和 workerId，执行：
npx tsx scripts/runtime-run-once.ts --jobId="<jobId>" --workerId="<workerId>" --mode=dry_run

### 第四步：验证结果
执行：
npx tsx scripts/runtime-verify-once.ts --jobId="<jobId>" --workerId="<workerId>"

### 第五步：生成测试报告
汇总所有步骤的执行结果，生成测试报告

## 预期结果
- 所有步骤执行成功
- 每个步骤返回 ok: true
- 最终生成完整的测试报告

请按顺序执行，并在每一步输出详细结果。
```

## 提示词 3：压力测试

```
请帮我执行运行时执行系统的压力测试：

## 测试目标
验证系统在并发场景下的稳定性

## 测试内容

### 场景 1：批量任务创建
连续创建 5 个示例任务，每个任务间隔 1 秒

### 场景 2：并发执行
对创建的 5 个任务同时执行 dry_run 模式

### 场景 3：并发验证
对执行完成的 5 个任务同时进行验证

## 执行要求
- 使用不同的 taskId（格式: stress-test-{index}-{timestamp}）
- 记录每个任务的执行时间
- 统计成功/失败数量
- 生成压力测试报告

请按场景顺序执行，并输出详细的测试结果。
```

## 提示词 4：异常场景测试

```
请帮我执行运行时执行系统的异常场景测试：

## 测试目标
验证系统在异常情况下的容错能力

## 测试场景

### 场景 1：无效 jobId
尝试使用不存在的 jobId 执行任务，验证错误处理

### 场景 2：重复执行
对同一个任务重复执行两次 dry_run，验证幂等性

### 场景 3：无效 mode
尝试使用无效的 mode 参数，验证参数校验

### 场景 4：缺少必填参数
尝试不提供必填参数执行脚本，验证参数校验

## 预期结果
- 所有异常场景都能正确返回错误信息
- 系统不会崩溃
- 错误信息清晰明了

请按场景顺序执行，并记录每个场景的测试结果。
```

## 使用方法

1. 复制上述提示词中的任意一个
2. 粘贴到 ChatHub 界面
3. 发送消息
4. 系统会自动执行测试流程
5. 查看执行结果

## 注意事项

- 确保开发服务器已启动（npm run dev）
- 确保数据库已初始化（npx prisma db push）
- 测试过程中不要关闭开发服务器
- 如需停止测试，可按 Ctrl+C
