// 权限控制模块

import { randomUUID } from 'node:crypto'

export type PermissionAction =
  | 'read_file'
  | 'write_file'
  | 'delete_file'
  | 'execute_code'
  | 'call_api'
  | 'git_commit'
  | 'git_push'
  | 'deploy'

export type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

export interface PermissionRequest {
  id: string
  action: PermissionAction
  resource: string
  userId: string
  context: Record<string, unknown>
  requestedAt: Date
}

export interface PermissionDecision {
  id: string
  requestId: string
  action: PermissionAction
  resource: string
  userId: string
  decision: 'approved' | 'denied' | 'pending'
  reason: string
  approvedBy?: string
  approvedAt?: Date
  expiresAt?: Date
}

export interface UserPermissions {
  userId: string
  level: PermissionLevel
  allowedActions: PermissionAction[]
  deniedActions: PermissionAction[]
  restrictions: Record<string, unknown>
}

export class PermissionGuard {
  private permissions: Map<string, UserPermissions> = new Map()
  private pendingRequests: Map<string, PermissionRequest> = new Map()
  private decisions: Map<string, PermissionDecision> = new Map()

  /**
   * 注册用户权限
   */
  registerUser(userId: string, permissions: UserPermissions): void {
    this.permissions.set(userId, permissions)
  }

  /**
   * 请求权限
   */
  async requestPermission(
    action: PermissionAction,
    resource: string,
    userId: string,
    context: Record<string, unknown> = {}
  ): Promise<PermissionRequest> {
    const request: PermissionRequest = {
      id: randomUUID(),
      action,
      resource,
      userId,
      context,
      requestedAt: new Date(),
    }

    this.pendingRequests.set(request.id, request)
    return request
  }

  /**
   * 检查权限
   */
  async checkPermission(
    action: PermissionAction,
    resource: string,
    userId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    const userPermissions = this.permissions.get(userId)

    // 如果没有注册权限，默认拒绝
    if (!userPermissions) {
      return { allowed: false, reason: 'User not registered' }
    }

    // 检查是否在拒绝列表中
    if (userPermissions.deniedActions.includes(action)) {
      return { allowed: false, reason: 'Action explicitly denied' }
    }

    // 检查是否在允许列表中
    if (userPermissions.allowedActions.includes(action)) {
      return { allowed: true, reason: 'Action allowed' }
    }

    // 根据权限级别判断
    switch (userPermissions.level) {
      case 'admin':
        return { allowed: true, reason: 'Admin access' }
      case 'write':
        if (['read_file', 'execute_code', 'call_api'].includes(action)) {
          return { allowed: true, reason: 'Write level access' }
        }
        return { allowed: false, reason: 'Insufficient permissions' }
      case 'read':
        if (['read_file'].includes(action)) {
          return { allowed: true, reason: 'Read level access' }
        }
        return { allowed: false, reason: 'Insufficient permissions' }
      default:
        return { allowed: false, reason: 'No access level' }
    }
  }

  /**
   * 批准权限请求
   */
  async approveRequest(
    requestId: string,
    approvedBy: string,
    reason: string = 'Approved by human'
  ): Promise<PermissionDecision> {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      throw new Error(`Request not found: ${requestId}`)
    }

    const decision: PermissionDecision = {
      id: randomUUID(),
      requestId,
      action: request.action,
      resource: request.resource,
      userId: request.userId,
      decision: 'approved',
      reason,
      approvedBy,
      approvedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 小时后过期
    }

    this.decisions.set(decision.id, decision)
    this.pendingRequests.delete(requestId)

    return decision
  }

  /**
   * 拒绝权限请求
   */
  async denyRequest(
    requestId: string,
    reason: string = 'Denied by human'
  ): Promise<PermissionDecision> {
    const request = this.pendingRequests.get(requestId)
    if (!request) {
      throw new Error(`Request not found: ${requestId}`)
    }

    const decision: PermissionDecision = {
      id: randomUUID(),
      requestId,
      action: request.action,
      resource: request.resource,
      userId: request.userId,
      decision: 'denied',
      reason,
    }

    this.decisions.set(decision.id, decision)
    this.pendingRequests.delete(requestId)

    return decision
  }

  /**
   * 获取待处理的请求
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values())
  }

  /**
   * 获取用户的决策历史
   */
  getUserDecisions(userId: string): PermissionDecision[] {
    return Array.from(this.decisions.values()).filter(d => d.userId === userId)
  }

  /**
   * 检查决策是否仍然有效
   */
  isDecisionValid(decisionId: string): boolean {
    const decision = this.decisions.get(decisionId)
    if (!decision) {
      return false
    }

    if (decision.decision !== 'approved') {
      return false
    }

    if (decision.expiresAt && decision.expiresAt < new Date()) {
      return false
    }

    return true
  }
}
