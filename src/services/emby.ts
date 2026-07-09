import { EmbyUser, EmbyLibraryStats } from '../types';

const API_KEY_HEADER = 'X-Emby-Token';

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
      [API_KEY_HEADER]: apiKey,
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
    UserType: user.UserType,
    // IsAdministrator 优先取顶层，其次取 Policy
    IsAdministrator: user.IsAdministrator !== undefined ? user.IsAdministrator : user.Policy?.IsAdministrator === true,
    HasPassword: user.HasPassword,
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
      const policy = await getUserPolicy(serverUrl, apiKey, templateUserId);
      if (policy) {
        await updateUserPolicy(serverUrl, apiKey, newUser.Id, policy);
      }
    } catch (e) {
      console.error('Failed to copy user policy from template:', e);
    }

    try {
      const config = await getUserConfiguration(serverUrl, apiKey, templateUserId);
      if (config) {
        await updateUserConfiguration(serverUrl, apiKey, newUser.Id, config);
      }
    } catch (e) {
      console.error('Failed to copy user configuration from template:', e);
    }
  }

  return normalizeUser(newUser);
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
 * 获取服务器信息
 */
export async function getServerInfo(serverUrl: string, apiKey: string): Promise<any> {
  return embyApiCall(serverUrl, apiKey, '/System/Info');
}
