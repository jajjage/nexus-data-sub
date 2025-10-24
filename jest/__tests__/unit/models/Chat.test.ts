import db from '../../../../src/database/connection';
import { ChatModel } from '../../../../src/models/Chat';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

describe('ChatModel', () => {
  let testUser: any;
  let testChannel: any;

  beforeEach(async () => {
    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'chat.user@example.com',
      fullName: 'Chat User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);

    // Create a channel for testing
    [testChannel] = await db('channels')
      .insert({
        name: 'Test Channel',
        is_support: false,
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('messages').where({ channel_id: testChannel.id }).del();
    await db('channel_members').where({ channel_id: testChannel.id }).del();
    await db('channels').where({ id: testChannel.id }).del();
    if (testUser?.userId) {
      await db('users').where({ id: testUser.userId }).del();
    }
  });

  describe('createSupportChannel', () => {
    it('should create a new support channel and add the user as a member', async () => {
      const channel = await ChatModel.createSupportChannel(testUser.userId);
      expect(channel).toBeDefined();
      expect(channel.is_support).toBe(true);

      const members = await db('channel_members').where({
        channel_id: channel.id,
      });
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(testUser.userId);
    });
  });

  describe('addMember', () => {
    it('should add a user to a channel', async () => {
      await ChatModel.addMember(testChannel.id, testUser.userId);
      const member = await db('channel_members')
        .where({
          channel_id: testChannel.id,
          user_id: testUser.userId,
        })
        .first();
      expect(member).toBeDefined();
    });
  });

  describe('findUserChannels', () => {
    it('should find all channels a user is a member of', async () => {
      await ChatModel.addMember(testChannel.id, testUser.userId);
      const channels = await ChatModel.findUserChannels(testUser.userId);
      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe(testChannel.id);
    });
  });

  describe('getChannelMembers', () => {
    it('should get all members of a channel', async () => {
      await ChatModel.addMember(testChannel.id, testUser.userId);
      const members = await ChatModel.getChannelMembers(testChannel.id);
      expect(members).toHaveLength(1);
      expect(members[0]).toBe(testUser.userId);
    });
  });

  describe('createMessage', () => {
    it('should create a new message in a channel', async () => {
      const messageData = {
        client_msg_id: 'test-client-msg-id',
        channel_id: testChannel.id,
        sender_id: testUser.userId,
        body: 'Hello, world!',
      };
      const message = await ChatModel.createMessage(messageData);
      expect(message).toBeDefined();
      expect(message.body).toBe('Hello, world!');
    });
  });

  describe('findMessagesByChannel', () => {
    it('should find all messages in a channel', async () => {
      const messageData = {
        client_msg_id: 'test-client-msg-id',
        channel_id: testChannel.id,
        sender_id: testUser.userId,
        body: 'Hello, world!',
      };
      await ChatModel.createMessage(messageData);
      const messages = await ChatModel.findMessagesByChannel(testChannel.id);
      expect(messages).toHaveLength(1);
      expect(messages[0].body).toBe('Hello, world!');
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark a message as read by a user', async () => {
      const messageData = {
        client_msg_id: 'test-client-msg-id',
        channel_id: testChannel.id,
        sender_id: testUser.userId,
        body: 'Hello, world!',
      };
      const message = await ChatModel.createMessage(messageData);
      await ChatModel.markMessageAsRead(message.id, testUser.userId);
      const receipt = await db('message_receipts')
        .where({
          message_id: message.id,
          user_id: testUser.userId,
        })
        .first();
      expect(receipt).toBeDefined();
      expect(receipt.read_at).not.toBeNull();
    });
  });
});
