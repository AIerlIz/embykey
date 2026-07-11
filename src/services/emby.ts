import { Env, EmbyUser, EmbyLibraryStats } from '../types';

/**
 * 调用 Emby API 的通用函数
 */
async function embyApiCall<T>(
  serverUrl: string,
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${serverUrl.replace(/\/+$/, '')}/emby${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Emby-Token': apiKey,
      'X-Emby-Authorization': 'Emby Client="EmbyRegister", Device="Worker", DeviceId="worker", Version="1.0.0"',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Emby API error (${response.status}): ${text}`);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

/**
 * 使用管理员凭据获取 API 密钥（登录验证）
 * 返回 { AccessToken, User }
 */
export async function authenticateUserByName(
  serverUrl: string,
  apiKey: string,
  username: string,
  password: string
): Promise<{ AccessToken: string; User: EmbyUser } | null> {
  if (!serverUrl) {
    console.error('[Auth] EMBY_SERVER_URL 未设置');
    return null;
  }
  const url = `${serverUrl.replace(/\/+$/, '')}/emby/Users/AuthenticateByName`;
  console.log(`[Auth] 正在连接 Emby 服务器: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': apiKey,
        'X-Emby-Authorization': 'Emby Client="EmbyRegister", Device="Worker", DeviceId="worker", Version="1.0.0"',
      },
      body: JSON.stringify({
        Username: username,
        Pw: password,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Auth] Emby 返回错误 (${response.status}): ${text.substring(0, 200)}`);
      return null;
    }

    const data: any = await response.json();
    const user = data.User || data.user;
    if (!user) {
      console.error('[Auth] 响应中未找到用户信息:', JSON.stringify(data).substring(0, 200));
      return null;
    }
    console.log(`[Auth] 验证成功，用户 "${user.Name || username}" 是管理员: ${!!user.IsAdministrator}`);
    return { AccessToken: data.AccessToken || '', User: user };
  } catch (err: any) {
    console.error(`[Auth] 连接失败: ${err.message}`);
    console.error(`[Auth] 请确认: 1) EMBY_SERVER_URL 是否正确; 2) 服务器可从公网访问`);
    return null;
  }
}

/**
 * 验证管理员身份：通过用户名密码登录，检查是否为管理员
 */
export async function validateAdmin(
  serverUrl: string,
  apiKey: string,
  username: string,
  password: string
): Promise<EmbyUser | null> {
  const auth = await authenticateUserByName(serverUrl, apiKey, username, password);
  if (!auth || !auth.User) return null;
  // 兼容两种 IsAdministrator 字段位置：直接属性 或 Policy 内
  const isAdmin = auth.User.IsAdministrator || auth.User.Policy?.IsAdministrator === true;
  if (!isAdmin) return null;
  return auth.User;
}

/**
 * 标准化用户对象：确保 IsAdministrator 等字段正确映射到顶层
 */
function normalizeUser(user: any): EmbyUser {
  return {
    Id: user.Id,
    Name: user.Name,
    ServerId: user.ServerId,
    // IsAdministrator 优先取顶层，其次取 Policy
    IsAdministrator: user.IsAdministrator !== undefined ? user.IsAdministrator : user.Policy?.IsAdministrator === true,
    HasPassword: !!user.HasPassword,
    Policy: {
      IsAdministrator: user.Policy?.IsAdministrator ?? (user.IsAdministrator === true),
      IsHidden: user.Policy?.IsHidden,
      IsDisabled: user.Policy?.IsDisabled,
      EnableUserPreferenceAccess: user.Policy?.EnableUserPreferenceAccess,
    },
  };
}

/**
 * 创建 Emby 用户，并可选择从模板用户复制策略和配置
 */
export async function createUser(
  serverUrl: string,
  apiKey: string,
  username: string,
  password: string,
  templateUserId?: string
): Promise<EmbyUser> {
  // 1. 创建用户
  const newUser = await embyApiCall<any>(serverUrl, apiKey, `/Users/New`, {
    method: 'POST',
    body: JSON.stringify({
      Name: username,
    }),
  });

  // 2. 设置密码
  await embyApiCall(serverUrl, apiKey, `/Users/${newUser.Id}/Password`, {
    method: 'POST',
    body: JSON.stringify({
      Id: newUser.Id,
      CurrentPw: '',
      NewPw: password,
    }),
  });

  // 3. 如果指定了模板用户，复制策略和配置
  if (templateUserId) {
    try {
      // 通过 GET /Users/{Id}?Fields=Policy,Configuration 获取模板用户的策略和配置
      const templateData = await getUserWithPolicy(serverUrl, apiKey, templateUserId);
      if (templateData) {
        const templatePolicy = templateData.Policy;
        const templateConfig = templateData.Configuration;
        
        if (templatePolicy) {
          try {
            await updateUserPolicy(serverUrl, apiKey, newUser.Id, templatePolicy);
            console.log(`[Template] 模板用户策略已复制到新用户 ${username}`);
          } catch (e: any) {
            console.warn(`[Template] 复制策略失败: ${e.message}`);
          }
        }
        
        if (templateConfig) {
          try {
            await updateUserConfiguration(serverUrl, apiKey, newUser.Id, templateConfig);
            console.log(`[Template] 模板用户配置已复制到新用户 ${username}`);
          } catch (e: any) {
            console.warn(`[Template] 复制配置失败: ${e.message}`);
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Template] 获取模板用户数据失败: ${e.message}`);
    }
  }

  return normalizeUser(newUser);
}

/**
 * 获取含策略和配置的用户对象 — GET /Users/{Id}?Fields=Policy,Configuration
 * 替代不可用的独立 Policy/Configuration 端点
 */
export async function getUserWithPolicy(
  serverUrl: string,
  apiKey: string,
  userId: string
): Promise<any> {
  return embyApiCall<any>(serverUrl, apiKey, `/Users/${userId}?Fields=Policy,Configuration`);
}

/**
 * 获取用户策略
 */
export async function getUserPolicy(
  serverUrl: string,
  apiKey: string,
  userId: string
): Promise<any> {
  return embyApiCall<any>(serverUrl, apiKey, `/Users/${userId}/Policy`);
}

/**
 * 更新用户策略
 */
export async function updateUserPolicy(
  serverUrl: string,
  apiKey: string,
  userId: string,
  policy: any
): Promise<void> {
  await embyApiCall(serverUrl, apiKey, `/Users/${userId}/Policy`, {
    method: 'POST',
    body: JSON.stringify(policy),
  });
}

/**
 * 获取用户配置
 */
export async function getUserConfiguration(
  serverUrl: string,
  apiKey: string,
  userId: string
): Promise<any> {
  return embyApiCall<any>(serverUrl, apiKey, `/Users/${userId}/Configuration`);
}

/**
 * 更新用户配置
 */
export async function updateUserConfiguration(
  serverUrl: string,
  apiKey: string,
  userId: string,
  config: any
): Promise<void> {
  await embyApiCall(serverUrl, apiKey, `/Users/${userId}/Configuration`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/**
 * 获取用户列表
 */
export async function getUsers(serverUrl: string, apiKey: string): Promise<EmbyUser[]> {
  const users = await embyApiCall<any[]>(serverUrl, apiKey, '/Users');
  // 标准化所有用户对象，确保 IsAdministrator 等字段正确映射
  return users.map(u => normalizeUser(u));
}

/**
 * 获取媒体库统计数据
 */
export async function getLibraryStats(
  serverUrl: string,
  apiKey: string
): Promise<EmbyLibraryStats> {
  return embyApiCall<EmbyLibraryStats>(serverUrl, apiKey, '/Items/Counts');
}

/**
 * 获取用户的继续观看项目数
 */
export async function getUserResumeCount(
  serverUrl: string,
  apiKey: string,
  userId: string
): Promise<number> {
  try {
    const result = await embyApiCall<any>(serverUrl, apiKey, `/Users/${userId}/Items/Resume?Limit=0`);
    return result.TotalRecordCount || 0;
  } catch {
    return 0;
  }
}

/**
 * 批量获取多个用户的继续观看项目数
 */
export async function getUsersResumeCounts(
  serverUrl: string,
  apiKey: string,
  userIds: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  const entries = await Promise.all(
    userIds.map(async (id) => {
      const count = await getUserResumeCount(serverUrl, apiKey, id);
      return [id, count] as const;
    })
  );
  for (const [id, count] of entries) {
    results[id] = count;
  }
  return results;
}

/**
 * 获取媒体库统计数据
 *
  serverUrl: string,
  apiKey: string
): Promise<EmbyLibraryStats> {
  return embyApiCall<EmbyLibraryStats>(serverUrl, apiKey, '/Items/Counts');
}

/**
 * 获取服务器信息
 */
export async function getServerInfo(serverUrl: string, apiKey: string): Promise<any> {
  return embyApiCall(serverUrl, apiKey, '/System/Info');
}

/**
 * 获取 Emby 服务器名称
 * 优先从 KV 缓存读取，未命中则调用 Emby API 获取，存入 KV 缓存（TTL 1 小时）
 * 兜底链路：KV 缓存 → Emby API → env.EMBY_SERVER_NAME → "Emby Server"
 */
export async function getServerName(env: Env): Promise<string> {
  // 1. 尝试从 KV 缓存读取
  try {
    const cached = await env.INVITE_CODES.get('config:server_name_cached');
    if (cached) return cached;
  } catch {
    // KV 不可用时继续走后续链路
  }

  // 2. 尝试从 Emby API 实时获取
  if (env.EMBY_SERVER_URL && env.EMBY_API_KEY) {
    try {
      const info = await getServerInfo(env.EMBY_SERVER_URL, env.EMBY_API_KEY);
      if (info && info.ServerName) {
        // 写入 KV 缓存（TTL 3600 秒）
        try {
          await env.INVITE_CODES.put('config:server_name_cached', info.ServerName, {
            expirationTtl: 3600,
          });
        } catch {}
        return info.ServerName;
      }
    } catch {
      // API 不可用时继续走后续链路
    }
  }

  // 3. 兜底：环境变量
  if (env.EMBY_SERVER_NAME) {
    return env.EMBY_SERVER_NAME;
  }

  // 4. 最终兜底
  return 'Emby Server';
}


/**
 * 删除 Emby 用户
 */
export async function deleteUser(
  serverUrl: string,
  apiKey: string,
  userId: string
): Promise<void> {
  await embyApiCall(serverUrl, apiKey, `/Users/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * 切换用户禁用状态
 */
export async function toggleUserDisabled(
  serverUrl: string,
  apiKey: string,
  userId: string,
  disabled: boolean
): Promise<void> {
  // 通过 GET /Users/{Id}?Fields=Policy 获取用户策略
  const userData = await getUserWithPolicy(serverUrl, apiKey, userId);
  const policy = userData.Policy || {};
  policy.IsDisabled = disabled;
  await updateUserPolicy(serverUrl, apiKey, userId, policy);
}

/**
 * 发起忘记密码流程（Emby 会向用户邮箱发送 PIN）
 */
export async function forgotPassword(
  serverUrl: string,
  username: string
): Promise<any> {
  const url = `${serverUrl.replace(/\/+$/, '')}/emby/Users/ForgotPassword`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ EnteredUsername: username }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ForgotPassword API error: ${text}`);
  }
  return response.json();
}

/**
 * 验证 PIN 并获取重置令牌
 */
export async function forgotPasswordPin(
  serverUrl: string,
  pin: string
): Promise<any> {
  const url = `${serverUrl.replace(/\/+$/, '')}/emby/Users/ForgotPassword/Pin`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Pin: pin }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ForgotPasswordPin API error: ${text}`);
  }
  return response.json();
}
