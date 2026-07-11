import { DurableObject } from 'cloudflare:workers';
import { Env } from '../types';

/**
 * Durable Object — 邀请码原子计数器
 * 每个邀请码对应一个 DO 实例，确保 useCount 递增是原子操作
 */
export class InviteCounter extends DurableObject {
  private useCount: number = 0;
  private maxUses: number = -1;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // 从持久化存储恢复状态
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<{ useCount: number; maxUses: number }>('state');
      if (stored) {
        this.useCount = stored.useCount;
        this.maxUses = stored.maxUses;
      }
    });
  }

  /**
   * 尝试使用一次邀请码
   * @returns { success: boolean; useCount: number; message?: string }
   */
  async tryUse(code: string, maxUses: number): Promise<{ success: boolean; useCount: number; message?: string }> {
    if (this.maxUses === -1) {
      // 首次初始化
      this.maxUses = maxUses;
    }

    if (this.maxUses !== -1 && this.useCount >= this.maxUses) {
      return { success: false, useCount: this.useCount, message: '\u9080\u8bf7\u7801\u5df2\u5931\u6548\uff08\u4f7f\u7528\u6b21\u6570\u5df2\u7528\u5b8c\uff09' };
    }

    this.useCount++;
    await this.ctx.storage.put('state', { useCount: this.useCount, maxUses: this.maxUses });
    return { success: true, useCount: this.useCount };
  }

  /**
   * 获取当前使用次数
   */
  async getCount(): Promise<{ useCount: number; maxUses: number }> {
    return { useCount: this.useCount, maxUses: this.maxUses };
  }
}
