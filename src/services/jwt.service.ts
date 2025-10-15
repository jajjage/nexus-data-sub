/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/jwt.service.ts
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  sessionId?: string;
  aud: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Recommendation:
//   For a production system, implement a more robust secret management strategy.
//    - Use a key management service (KMS) like AWS KMS, GCP KMS, or HashiCorp Vault.
//    - Implement a JWKS (JSON Web Key Set) endpoint, allowing the application to fetch a set of valid public keys
//      for verifying tokens. This is standard practice for OAuth 2.0 and OpenID Connect and allows for seamless key
//      rotation without service restarts.

export class JwtService {
  private static getSecrets() {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (
      !accessSecret ||
      accessSecret === 'your-super-secret-jwt-key-change-in-production'
    ) {
      throw new Error(
        'JWT_SECRET environment variable must be set to a secure value'
      );
    }
    if (
      !refreshSecret ||
      refreshSecret === 'your-super-secret-refresh-key-change-in-production'
    ) {
      throw new Error(
        'JWT_REFRESH_SECRET environment variable must be set to a secure value'
      );
    }

    return { accessSecret, refreshSecret };
  }

  static generateTokenPair(payload: JwtPayload): TokenPair {
    try {
      const { accessSecret, refreshSecret } = this.getSecrets();

      const accessTokenOptions: jwt.SignOptions = {
        expiresIn: (process.env.JWT_EXPIRES_IN ||
          '24h') as jwt.SignOptions['expiresIn'],
        issuer: 'nexus-service',
      };

      const refreshTokenOptions: jwt.SignOptions = {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ||
          '7d') as jwt.SignOptions['expiresIn'],
        issuer: 'nexus-service',
      };

      const accessToken = jwt.sign(payload, accessSecret, accessTokenOptions);
      const refreshToken = jwt.sign(
        payload,
        refreshSecret,
        refreshTokenOptions
      );

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new Error('Failed to generate tokens');
    }
  }

  static verifyToken(token: string, expectedEmail?: string): JwtPayload | null {
    if (!token) {
      return null;
    }

    try {
      const { accessSecret } = this.getSecrets();

      const decoded = jwt.verify(token, accessSecret, {
        issuer: 'nexus-service',
      }) as JwtPayload;

      if (expectedEmail && decoded.aud !== expectedEmail) {
        throw new Error('Token audience mismatch');
      }

      return decoded;
    } catch (error) {
      // Don't log every failed verification - it's normal for expired tokens
      return null;
    }
  }

  static verifyRefreshToken(
    token: string,
    expectedEmail?: string
  ): JwtPayload | null {
    if (!token) {
      return null;
    }

    try {
      const { refreshSecret } = this.getSecrets();

      const decoded = jwt.verify(token, refreshSecret, {
        issuer: 'nexus-service',
      }) as JwtPayload;

      if (expectedEmail && decoded.aud !== expectedEmail) {
        throw new Error('Token audience mismatch');
      }

      return decoded;
    } catch (error) {
      // Don't log every failed verification - it's normal for expired tokens
      return null;
    }
  }
}
