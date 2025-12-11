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
        // Chat & message schemas
        Channel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isSupport: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            clientMsgId: { type: 'string' },
            channelId: { type: 'string', format: 'uuid' },
            senderId: { type: 'string', format: 'uuid' },
            body: { type: 'string' },
            attachments: { type: 'array', items: { type: 'object' } },
            metadata: { type: 'object' },
            seq: { type: 'integer', format: 'int64' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ChannelListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Channel' },
            },
          },
        },
        MessagesListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Message' },
            },
          },
        },

        // Notification schemas
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description:
                'User notification tracking ID (or notification ID if not tracked)',
            },
            notification_id: {
              type: 'string',
              format: 'uuid',
              description: 'The notification ID',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'The user ID',
            },
            read: {
              type: 'boolean',
              description: 'Whether the notification has been read by the user',
            },
            read_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Timestamp when the notification was marked as read',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Notification creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Notification last update timestamp',
            },
            notification: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                body: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['info', 'success', 'warning', 'error', 'alert'],
                },
                category: { type: 'string' },
                publish_at: { type: 'string', format: 'date-time' },
                sent: { type: 'boolean' },
                archived: { type: 'boolean' },
              },
              description: 'The notification details',
            },
          },
        },
        NotificationAdmin: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            body: { type: 'string' },
            type: {
              type: 'string',
              enum: ['info', 'success', 'warning', 'error', 'alert'],
            },
            category: { type: 'string' },
            target_criteria: { type: 'object' },
            publish_at: { type: 'string', format: 'date-time' },
            created_by: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            sent: { type: 'boolean' },
            archived: { type: 'boolean' },
          },
          description: 'Notification object for admin endpoints',
        },
        CreateNotificationRequest: {
          type: 'object',
          required: ['title', 'body'],
          properties: {
            title: {
              type: 'string',
              description: 'Notification title',
            },
            body: {
              type: 'string',
              description: 'Notification body/content',
            },
            type: {
              type: 'string',
              enum: ['info', 'success', 'warning', 'error', 'alert'],
              description: 'Notification type (default: info)',
            },
            category: {
              type: 'string',
              description: 'Notification category for filtering',
            },
            targetCriteria: {
              type: 'object',
              description: 'Target criteria for selective user delivery',
              properties: {
                registrationDateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' },
                  },
                },
                minTransactionCount: { type: 'integer' },
                maxTransactionCount: { type: 'integer' },
                minTopupCount: { type: 'integer' },
                maxTopupCount: { type: 'integer' },
                lastActiveWithinDays: { type: 'integer' },
              },
            },
            publish_at: {
              type: 'string',
              format: 'date-time',
              description: 'When to publish the notification',
            },
          },
        },
        UserNotificationPreference: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            category: {
              type: 'string',
              description: 'Notification category',
            },
            subscribed: {
              type: 'boolean',
              description: 'Whether user is subscribed to this category',
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        PushTokenRegisterRequest: {
          type: 'object',
          required: ['platform', 'token'],
          properties: {
            platform: {
              type: 'string',
              enum: ['ios', 'android', 'web'],
              description: 'Push notification platform',
            },
            token: {
              type: 'string',
              description: 'FCM push token',
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
