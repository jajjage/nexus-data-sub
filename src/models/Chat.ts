import db from '../database/connection';
import { Channel, CreateMessageInput, Message } from '../types/chat.types';
import { generateUUID } from '../utils/crypto';

export class ChatModel {
  /**
   * Creates a new support channel for a user.
   * @param userId - The ID of the user initiating the support chat.
   * @returns The newly created channel.
   */
  static async createSupportChannel(userId: string): Promise<Channel> {
    return db.transaction(async trx => {
      const [channel] = await trx('channels')
        .insert({
          name: `Support for ${userId}`,
          is_support: true,
        })
        .returning('*');

      await trx('channel_members').insert([
        {
          channel_id: channel.id,
          user_id: userId,
          role: 'user',
        },
      ]);

      return channel;
    });
  }

  /**
   * Adds a user to a channel.
   * @param channelId - The ID of the channel.
   * @param userId - The ID of the user to add.
   * @param role - The role of the user in the channel.
   */
  static async addMember(
    channelId: string,
    userId: string,
    role: 'user' | 'admin' = 'user'
  ): Promise<void> {
    await db('channel_members').insert({
      channel_id: channelId,
      user_id: userId,
      role,
    });
  }

  /**
   * Finds all channels a user is a member of.
   * @param userId - The ID of the user.
   * @returns A list of channels.
   */
  static async findUserChannels(userId: string): Promise<Channel[]> {
    return db('channels as c')
      .join('channel_members as cm', 'c.id', 'cm.channel_id')
      .where('cm.user_id', userId)
      .select('c.*');
  }

  /**
   * Finds all members of a given channel.
   * @param channelId - The ID of the channel.
   * @returns A list of user IDs.
   */
  static async getChannelMembers(channelId: string): Promise<string[]> {
    const members = await db('channel_members')
      .where({ channel_id: channelId })
      .select('user_id');
    return members.map(m => m.user_id);
  }

  /**
   * Creates a new message in a channel.
   * @param messageData - The data for the new message.
   * @returns The newly created message.
   */
  static async createMessage(
    messageData: CreateMessageInput
  ): Promise<Message> {
    const [message] = await db('messages')
      .insert({
        id: generateUUID(),
        ...messageData,
      })
      .returning('*');
    return message;
  }

  /**
   * Finds all messages in a given channel.
   * @param channelId - The ID of the channel.
   * @returns A list of messages.
   */
  static async findMessagesByChannel(channelId: string): Promise<Message[]> {
    return db('messages')
      .where({ channel_id: channelId })
      .orderBy('created_at', 'asc');
  }

  /**
   * Marks a message as read by a user.
   * @param messageId - The ID of the message.
   * @param userId - The ID of the user.
   */
  static async markMessageAsRead(
    messageId: string,
    userId: string
  ): Promise<void> {
    await db('message_receipts')
      .insert({
        id: generateUUID(),
        message_id: messageId,
        user_id: userId,
        read_at: db.fn.now(),
      })
      .onConflict(['message_id', 'user_id'])
      .merge();
  }
}
