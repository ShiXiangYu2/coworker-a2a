// 回滚管理模块

import { randomUUID } from 'node:crypto'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface Snapshot {
  id: string
  taskId: string
  timestamp: Date
  description: string
  files: Array<{
    path: string
    content: string
    hash: string
  }>
  metadata: Record<string, unknown>
}

export interface RollbackResult {
  success: boolean
  restoredFiles: string[]
  errors: string[]
}

export class RollbackManager {
  private snapshots: Map<string, Snapshot> = new Map()
  private snapshotDir: string

  constructor(snapshotDir: string = './.snapshots') {
    this.snapshotDir = snapshotDir
  }

  /**
   * 初始化快照目录
   */
  async init(): Promise<void> {
    await fs.mkdir(this.snapshotDir, { recursive: true })
  }

  /**
   * 创建快照
   */
  async createSnapshot(
    taskId: string,
    files: string[],
    description: string
  ): Promise<Snapshot> {
    const snapshotFiles: Snapshot['files'] = []

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const hash = await this.calculateHash(content)
        snapshotFiles.push({
          path: filePath,
          content,
          hash,
        })
      } catch (error) {
        // 文件可能不存在，跳过
        console.warn(`Failed to read file for snapshot: ${filePath}`)
      }
    }

    const snapshot: Snapshot = {
      id: randomUUID(),
      taskId,
      timestamp: new Date(),
      description,
      files: snapshotFiles,
      metadata: {
        fileCount: snapshotFiles.length,
        totalSize: snapshotFiles.reduce((sum, f) => sum + f.content.length, 0),
      },
    }

    this.snapshots.set(snapshot.id, snapshot)

    // 保存到磁盘
    await this.saveSnapshotToDisk(snapshot)

    return snapshot
  }

  /**
   * 回滚到快照
   */
  async rollback(snapshotId: string): Promise<RollbackResult> {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) {
      return {
        success: false,
        restoredFiles: [],
        errors: [`Snapshot not found: ${snapshotId}`],
      }
    }

    const restoredFiles: string[] = []
    const errors: string[] = []

    for (const file of snapshot.files) {
      try {
        await fs.writeFile(file.path, file.content, 'utf-8')
        restoredFiles.push(file.path)
      } catch (error) {
        errors.push(`Failed to restore ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: errors.length === 0,
      restoredFiles,
      errors,
    }
  }

  /**
   * 获取快照列表
   */
  async listSnapshots(taskId?: string): Promise<Snapshot[]> {
    const snapshots = Array.from(this.snapshots.values())

    if (taskId) {
      return snapshots.filter(s => s.taskId === taskId)
    }

    return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 获取快照详情
   */
  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId)
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    this.snapshots.delete(snapshotId)

    // 从磁盘删除
    const snapshotFile = path.join(this.snapshotDir, `${snapshotId}.json`)
    try {
      await fs.unlink(snapshotFile)
    } catch {
      // 文件可能不存在
    }
  }

  /**
   * 保存快照到磁盘
   */
  private async saveSnapshotToDisk(snapshot: Snapshot): Promise<void> {
    await this.init()
    const snapshotFile = path.join(this.snapshotDir, `${snapshot.id}.json`)
    await fs.writeFile(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf-8')
  }

  /**
   * 从磁盘加载快照
   */
  async loadSnapshotsFromDisk(): Promise<void> {
    try {
      await this.init()
      const files = await fs.readdir(this.snapshotDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(this.snapshotDir, file), 'utf-8')
        const snapshot = JSON.parse(content) as Snapshot
        this.snapshots.set(snapshot.id, snapshot)
      }
    } catch (error) {
      console.warn('Failed to load snapshots from disk:', error)
    }
  }

  /**
   * 计算哈希
   */
  private async calculateHash(content: string): Promise<string> {
    const { createHash } = await import('crypto')
    return createHash('sha256').update(content).digest('hex')
  }
}
