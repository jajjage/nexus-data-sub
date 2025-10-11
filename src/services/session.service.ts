import { redisClientInstance } from '../database/redis';

const redis = redisClientInstance.getClient();
interface IBrowserData {
  name?: string;
  version?: string;
  major?: string;
  type?: string;
}

interface ICpuData {
  architecture?: string;
}

interface IDeviceData {
  type?: string;
  model?: string;
  vendor?: string;
}

interface IEngineData {
  name?: string;
  version?: string;
}

interface IOsData {
  name?: string;
  version?: string;
}

interface IParsedUserAgent {
  ua: string;
  browser: IBrowserData;
  cpu: ICpuData;
  device: IDeviceData;
  engine: IEngineData;
  os: IOsData;
  isWebClient: boolean;
  isMobileApp: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface UserAgentInfo {
  timestamp: string;
  type: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
  browser: string;
  os: string;
  device: string;
  rawUserAgent: string;
  parsed?: IParsedUserAgent;
}

// Session interface with proper user agent typing
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent: UserAgentInfo;
  ip: string;
  createdAt: number;
  lastActivity?: number;
  expiresAt: number;
  deviceId?: string;
}

// NOTE: In a real production environment, this script would be loaded via the EVALSHA command
// to avoid sending the script body with every request. For simplicity here, we use EVAL.
const LUA_DELETE_USER_SESSIONS_SCRIPT = `
  local userSessionsKey = KEYS[1]
  local sessionIds = redis.call('smembers', userSessionsKey)
  local deletedCount = 0
  if #sessionIds == 0 then
    return 0
  end
  for i, sessionId in ipairs(sessionIds) do
    local sessionKey = 'session:' .. sessionId
    local sessionData = redis.call('get', sessionKey)
    if sessionData then
      -- In a real scenario, you would use a proper JSON decoder for Lua.
      -- For this specific case, we can do a simple string search.
      local _, _, refreshToken = string.find(sessionData, '"refreshToken":"([^"]+)"')
      if refreshToken then
        local refreshTokenKey = 'refresh_token:' .. refreshToken
        redis.call('del', refreshTokenKey)
      end
      redis.call('del', sessionKey)
      deletedCount = deletedCount + 1
    end
  end
  redis.call('del', userSessionsKey)
  return deletedCount
`;

export class SessionService {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';

  // 30 days in seconds
  private static readonly SESSION_TTL = 30 * 24 * 60 * 60;

  // non‑recursive, low‑level fetch
  private static async rawGet(sessionId: string): Promise<Session | null> {
    const data = await redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  static async createSession(
    sessionId: string,
    userId: string,
    refreshToken: string,
    userAgent: UserAgentInfo,
    ip: string,
    deviceId?: string
  ): Promise<Session> {
    const now = Date.now();
    const expiresAt = now + this.SESSION_TTL * 1000;

    const session: Session = {
      id: sessionId,
      userId,
      refreshToken,
      userAgent,
      ip,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      deviceId,
    };

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const refreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;

    // Use a Redis transaction to ensure atomicity
    const pipeline = redis.multi();
    pipeline.setex(sessionKey, this.SESSION_TTL, JSON.stringify(session));
    pipeline.sadd(userSessionsKey, sessionId);
    pipeline.expire(userSessionsKey, this.SESSION_TTL);
    pipeline.setex(refreshTokenKey, this.SESSION_TTL, sessionId);
    await pipeline.exec();
    // console.log(`Session created with ID: ${sessionId}, User ID: ${userId}, Refresh Token: ${refreshToken}`);

    return session;
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.rawGet(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  static async getSessionById(sessionId: string): Promise<Session | null> {
    const session = await this.rawGet(sessionId);
    return session;
  }

  static async getSessionByRefreshToken(
    refreshToken: string
  ): Promise<Session | null> {
    const refreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${refreshToken}`;
    const sessionId = await redis.get(refreshTokenKey);

    if (!sessionId) {
      return null;
    }

    return this.rawGet(sessionId);
  }

  static async updateSessionToken(
    sessionId: string,
    newRefreshToken: string
  ): Promise<boolean> {
    const session = await this.rawGet(sessionId);
    if (!session) {
      return false;
    }

    // Remove old refresh token mapping
    const oldRefreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${session.refreshToken}`;

    // Update session with new refresh token and last activity
    session.refreshToken = newRefreshToken;
    session.lastActivity = Date.now();

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const newRefreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${newRefreshToken}`;

    // Use a Redis transaction to ensure atomicity
    const pipeline = redis.multi();
    pipeline.del(oldRefreshTokenKey);
    pipeline.setex(sessionKey, this.SESSION_TTL, JSON.stringify(session));
    pipeline.setex(newRefreshTokenKey, this.SESSION_TTL, sessionId);
    await pipeline.exec();

    return true;
  }

  static async updateLastActivity(sessionId: string): Promise<boolean> {
    const session = await this.rawGet(sessionId);
    if (!session) {
      return false;
    }

    session.lastActivity = Date.now();
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;

    await redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(session));

    return true;
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const session = await this.rawGet(sessionId);
    if (!session) {
      return false;
    }

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${session.userId}`;
    const refreshTokenKey = `${this.REFRESH_TOKEN_PREFIX}${session.refreshToken}`;

    // Use a Redis transaction to ensure atomicity
    const pipeline = redis.multi();
    pipeline.del(sessionKey);
    pipeline.del(refreshTokenKey);
    pipeline.srem(userSessionsKey, sessionId);
    await pipeline.exec();

    return true;
  }

  static async deleteAllUserSessions(userId: string): Promise<number> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const result = await redis.eval(
      LUA_DELETE_USER_SESSIONS_SCRIPT,
      1,
      userSessionsKey
    );
    return result as number;
  }

  static async getUserSessions(userId: string): Promise<Session[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await redis.smembers(userSessionsKey);

    if (sessionIds.length === 0) {
      return [];
    }

    const sessionKeys = sessionIds.map(id => `${this.SESSION_PREFIX}${id}`);
    const results = await redis.mget(sessionKeys);

    return results
      .filter((data): data is string => data !== null)
      .map(data => JSON.parse(data));
  }

  static async cleanupExpiredSessions(): Promise<number> {
    // This would be called by a scheduled job
    // For now, we rely on redis's automatic expiration
    // But we can implement additional cleanup logic here if needed
    return 0;
  }
}
