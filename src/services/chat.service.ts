import { Server } from 'socket.io';
import { ChatModel } from '../models/Chat';
import { CreateMessageInput } from '../types/chat.types';
import { ApiError } from '../utils/ApiError';
import { NotificationService } from './notification.service';
import { StaffService } from './staff.service';
import { generateUUID } from '../utils/crypto';
import { UserModel } from '../models/User';

let io: Server;

export const initChatService = (socketIo: Server) => {
  io = socketIo;
};

export class ChatService {
  /**
   * Initiates a new support chat for a user.
   * @param userId - The ID of the user.
   * @returns The newly created channel.
   */
  static async createSupportChannel(userId: string) {
    const channel = await ChatModel.createSupportChannel(userId);

    // Assign a staff member
    const staffId = await StaffService.assignStaffToChannel();
    if (staffId) {
      await ChatModel.addMember(channel.id, staffId, 'admin');

      // Send a welcome message
      const welcomeMessage: CreateMessageInput = {
        client_msg_id: generateUUID(),
        channel_id: channel.id,
        sender_id: 'bot', // Or a dedicated bot user ID
        body: 'Welcome to support! A staff member will be with you shortly.',
      };
      await ChatModel.createMessage(welcomeMessage);
    } else {
      // Handle case where no staff are available
      const admins = await UserModel.findByRole('admin');
      for (const admin of admins) {
        await NotificationService.sendToUser(
          admin.userId,
          'Support Request',
          `A user is waiting for support in channel ${channel.id}.`
        );
      }
    }

    return channel;
  }

  /**
   * Sends a message to a channel and broadcasts it.
   * @param messageData - The data for the new message.
   * @returns The newly created message.
   */
  static async sendMessage(messageData: CreateMessageInput) {
    const message = await ChatModel.createMessage(messageData);

    // Get channel members
    const channelMembers = await ChatModel.getChannelMembers(
      message.channel_id
    );

    // Filter out the sender
    const recipients = channelMembers.filter(id => id !== message.sender_id);

    // Broadcast to socket room
    if (io) {
      io.to(message.channel_id).emit('newMessage', message);

      // Check which recipients are offline and send them notifications
      for (const recipientId of recipients) {
        const isOnline = ChatService.isUserOnline(recipientId);

        if (!isOnline) {
          await NotificationService.sendToUser(
            recipientId,
            'New Message',
            `You have a new message in ${message.channel_id}`
          );
        }
      }
    }

    return message;
  }

  /**
   * Retrieves the message history for a channel.
   * @param channelId - The ID of the channel.
   * @param userId - The ID of the user requesting the messages.
   * @returns A list of messages.
   */
  static async getMessages(channelId: string, userId: string) {
    // Optional: Add a check to ensure the user is a member of the channel
    const channels = await ChatModel.findUserChannels(userId);
    if (!channels.some(c => c.id === channelId)) {
      throw new ApiError(403, 'You are not a member of this channel');
    }
    return ChatModel.findMessagesByChannel(channelId);
  }

  /**
   * Retrieves all channels for a user.
   * @param userId - The ID of the user.
   * @returns A list of the user's channels.
   */
  static async getUserChannels(userId: string) {
    return ChatModel.findUserChannels(userId);
  }

  /**
   * Checks if a user is currently online (has an active socket connection).
   * @param userId - The ID of the user to check.
   * @returns True if the user has an active socket connection.
   */
  private static isUserOnline(userId: string): boolean {
    if (!io) {
      return false;
    }
    // Check if any sockets are in the user's room
    const socketsInRoom = io.sockets.adapter.rooms.get(userId);
    return socketsInRoom !== undefined && socketsInRoom.size > 0;
  }
}
