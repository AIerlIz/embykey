// ====== Emby API 类型 ======

export interface EmbyUser {
  Id: string;
  Name: string;
  ServerId: string;
  UserType?: string; // "User", "Administrator", "Guest"
  IsAdministrator: boolean;
  HasPassword: boolean;
  Policy?: {
    IsAdministrator: boolean;
    IsHidden?: boolean;
    IsDisabled?: boolean;
    EnableUserPreferenceAccess?: boolean;
  };
}

export interface EmbyLibraryStats {
  MovieCount: number;
  SeriesCount: number;
  EpisodeCount: number;
  SongCount: number;
  AlbumCount: number;
  ArtistCount: number;
  GameCount: number;
  BookCount: number;
}

// ====== 邀请码类型 ======

export interface InviteCode {
  code: string;
  createdAt: string;       // ISO date
  createdBy: string;       // admin username
  usedAt?: string;         // ISO date when used
  usedBy?: string;         // username that used it
  maxUses: number;         // 最大使用次数，-1 表示无限
  useCount: number;        // 当前已使用次数
}

// ====== 注册请求类型 ======

export interface RegisterRequest {
  username: string;
  password: string;
  inviteCode: string;
  turnstileToken: string;
}

// ====== 环境变量类型 ======

export interface Env {
  EMBY_SERVER_URL: string;
  EMBY_SERVER_NAME?: string;
  EMBY_API_KEY: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  ADMIN_SESSION_SECRET: string;
  INVITE_CODES: KVNamespace;
}

// ====== Session 类型 ======

export interface AdminSession {
  username: string;
  token: string;
  expiresAt: number; // timestamp
}
