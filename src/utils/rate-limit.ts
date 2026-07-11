/**
 * 速率限制 — 基于 KV 的每 IP 每分钟请求计数
 */

const RATE_LIMIT_WINDOW = 60; // 窗口大小（秒）
const RATE_LIMIT_MAX = 10;    // 每个窗口最大请求数

export function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

export async function checkRateLimit(env: Env, key: string, maxRequests: number = RATE_LIMIT_MAX): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW;
  const kvKey = `ratelimit:${key}:${windowKey}`;

  try {
    const current = await env.INVITE_CODES.get(kvKey);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    await env.INVITE_CODES.put(kvKey, String(count + 1), {
      expirationTtl: RATE_LIMIT_WINDOW * 2,
    });

    return { allowed: true, remaining: maxRequests - count - 1 };
  } catch {
    // KV 不可用时放行
    return { allowed: true, remaining: 1 };
  }
}
