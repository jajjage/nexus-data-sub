import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { sendError, sendSuccess } from '../utils/response.utils';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
    sessionId: string;
  };
}

export class ChatController {
  static async createSupportChannel(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const userId = req.user.userId;
      const channel = await ChatService.createSupportChannel(userId);
      return sendSuccess(
        res,
        'Support channel created successfully',
        channel,
        201
      );
    } catch (error) {
      console.error('Create support channel error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async getUserChannels(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }
      const userId = req.user.userId;
      const channels = await ChatService.getUserChannels(userId);
      return sendSuccess(
        res,
        'User channels retrieved successfully',
        channels,
        200
      );
    } catch (error) {
      console.error('Get user channels error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }

  static async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401, []);
      }

      const userId = req.user.userId;
      const { channelId } = req.params;
      const messages = await ChatService.getMessages(channelId, userId);
      return sendSuccess(res, 'Messages retrieved successfully', messages, 200);
    } catch (error) {
      console.error('Get messages error:', error);
      return sendError(res, 'Internal server error', 500, []);
    }
  }
}
