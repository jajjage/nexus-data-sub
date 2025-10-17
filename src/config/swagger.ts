export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nexus Data Authentication Service API',
      version: '1.0.0',
      description:
        'Secure authentication and authorization service for Nexus Data system',
      contact: {
        name: 'Nexus Data Team',
        email: 'support@nexusdata.com',
      },
      license: {
        name: 'MIT',
        url: 'https://github.com/your-org/nexus-data-auth-service/blob/main/LICENSE',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.electionmonitoring.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Access token stored in cookies',
        },
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the user',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            role: {
              type: 'string',
              enum: ['user', 'staff', 'admin'],
              description: 'User role',
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            twoFactorEnabled: {
              type: 'boolean',
              description: 'Two-factor authentication status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },

        // Authentication schemas
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Password123!',
            },
            phoneNumber: {
              type: 'string',
              minLength: 11,
              example: '0000000000',
            },
            fullName: {
              type: 'string',
              minLength: 36,
              example: 'John Doe',
            },
          },
        },

        LoginRequest: {
          type: 'object',
          required: ['credentials', 'password'],
          properties: {
            credentialse: {
              type: 'string',
              enum: ['email', 'phone'],
              example: 'email or phone',
            },
            password: {
              type: 'string',
              example: 'Password123!',
            },
          },
        },
        ResendVerificationEmail: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
          },
        },

        TwoFactorLoginRequest: {
          type: 'object',
          required: ['credentials', 'password'],
          properties: {
            credentials: {
              type: 'string',
              enum: ['email', 'phone'],
              example: 'email or phone',
            },
            password: {
              type: 'string',
              example: 'Password123!',
            },
            totpCode: {
              type: 'string',
              minLength: 6,
              maxLength: 6,
              example: '123456',
              description: 'Required for 2FA-enabled accounts',
            },
          },
        },

        // 2FA schemas
        TwoFactorSetupResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: '2FA setup initiated successfully',
            },
            data: {
              type: 'object',
              properties: {
                qrCode: {
                  type: 'string',
                  description:
                    'Base64 encoded QR code for Google Authenticator',
                },
                backupCodes: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  description: 'Backup codes for 2FA recovery',
                },
              },
            },
          },
        },

        // Session schemas
        Session: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userAgent: {
              type: 'string',
              description: 'User agent string',
            },
            ip: {
              type: 'string',
              description: 'IP address',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
            },
            isCurrent: {
              type: 'boolean',
              description: 'Whether this is the current session',
            },
          },
        },

        // Error schemas
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error description',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};
