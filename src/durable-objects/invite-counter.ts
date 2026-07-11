import { DurableObject } from 'cloudflare:workers';
import { Env } from '../types';

/**
 * Durable Object — 邀请码原子计数器
 * 每个邀请码对应一个 DO 实例，确保 useCount 递增是原子操作
 * 通过 fetch 请求通信（兼容所有 Workers 运行时版本）
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

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/try-use') {
      const body: any = await request.json();
      const code = body.code;
      const maxUses = body.maxUses;

      if (this.maxUses === -1) {
        this.maxUses = maxUses;
      }

      if (this.maxUses !== -1 && this.useCount >= this.maxUses) {
        return Response.json({
          success: false,
          useCount: this.useCount,
          message: '邀请码已失效（使用次数已用完）',
        });
      }

      this.useCount++;
      await this.ctx.storage.put('state', { useCount: this.useCount, maxUses: this.maxUses });
      return Response.json({ success: true, useCount: this.useCount });
    }

    if (path === '/get-count') {
      return Response.json({ useCount: this.useCount, maxUses: this.maxUses });
    }

    return new Response('Not found', { status: 404 });
  }
}
