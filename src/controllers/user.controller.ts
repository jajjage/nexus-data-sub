import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
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

export class UserController {
  /**
   * Get the profile of the currently authenticated user.
   */
  static async getMyProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const userProfile = await UserService.getUserProfile(userId);
      return sendSuccess(
        res,
        'Profile retrieved successfully',
        userProfile,
        200
      );
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  /**
   * Update the profile of the currently authenticated user.
   * Supports updating fullName and/or profile picture URL.
   * If a file is provided (via multipart form), it should be pre-uploaded to a storage service
   * and the URL passed as profilePictureUrl in the body.
   */
  static async updateMyProfile(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { fullName, profilePictureUrl } = req.body;

      const updatedUser = await UserService.updateUserProfile(userId, {
        fullName,
        profilePictureUrl,
      });
      return sendSuccess(res, 'Profile updated successfully', updatedUser, 200);
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  /**
   * Set or update the transaction PIN for the currently authenticated user.
   */
  static async setTransactionPin(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { pin, currentPassword } = req.body;
      await UserService.setTransactionPin(userId, pin, currentPassword);
      return sendSuccess(res, 'Transaction PIN set successfully', {}, 200);
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  /**
   * Get the transaction history for the currently authenticated user.
   */
  static async getMyTransactions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { page = 1, limit = 20, direction, dateFrom, dateTo } = req.query;
      const transactions = await UserService.getTransactionHistory(userId, {
        page: Number(page),
        limit: Number(limit),
        direction: direction as 'credit' | 'debit' | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });
      return sendSuccess(
        res,
        'Transactions retrieved successfully',
        transactions,
        200
      );
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  /**
   * Get the purchase history for the currently authenticated user.
   */
  static async getMyPurchases(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { page = 1, limit = 20, status, dateFrom, dateTo } = req.query;
      const purchases = await UserService.getPurchaseHistory(userId, {
        page: Number(page),
        limit: Number(limit),
        status: status as
          | 'pending'
          | 'completed'
          | 'failed'
          | 'reversed'
          | 'retry'
          | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });
      return sendSuccess(
        res,
        'Purchase history retrieved successfully',
        purchases,
        200
      );
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  /**
   * Get a transaction by its ID.
   */
  static async getTransactionById(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const { id } = req.params;
      const transaction = await UserService.getTransactionById(id, userId);
      return sendSuccess(
        res,
        'Transaction retrieved successfully',
        transaction,
        200
      );
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  /**
   * Start a purchase (creates debit & pending request)
   */
  static async topup(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }

      const {
        amount,
        productCode,
        recipientPhone,
        supplierSlug,
        supplierMappingId,
      } = req.body;

      const result = await UserService.createTopupRequest(
        userId,
        amount,
        productCode,
        recipientPhone,
        supplierSlug,
        supplierMappingId
      );
      return sendSuccess(
        res,
        'Topup request created successfully',
        result,
        201
      );
    } catch (error: any) {
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }
}
