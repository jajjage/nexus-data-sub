import { ChatModel } from '../../../src/models/Chat';
import { UserModel } from '../../../src/models/User';
import { ChatService } from '../../../src/services/chat.service';
import { NotificationService } from '../../../src/services/notification.service';
import { StaffService } from '../../../src/services/staff.service';
import { generateUUID } from '../../../src/utils/crypto';

// Mock dependencies before they are imported by ChatService
jest.mock('../../../src/models/Chat');
jest.mock('../../../src/services/staff.service');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/models/User');
jest.mock('../../../src/utils/crypto');

describe('ChatService.createSupportChannel', () => {
  // Cast mocks to the correct type for type-safe mocking
  const mockChatModel = ChatModel as jest.Mocked<typeof ChatModel>;
  const mockStaffService = StaffService as jest.Mocked<typeof StaffService>;
  const mockNotificationService = NotificationService as jest.Mocked<
    typeof NotificationService
  >;
  const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
  const mockGenerateUUID = generateUUID as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a channel, assign staff, and send a welcome message', async () => {
    const mockChannel = { id: 'channel-123', name: 'Support for user-abc' };
    const mockStaffId = 'staff-xyz';
    const mockUUID = 'mock-uuid-123';

    // Arrange: Set up the mock implementations
    mockChatModel.createSupportChannel.mockResolvedValue(mockChannel as any);
    mockStaffService.assignStaffToChannel.mockResolvedValue(mockStaffId);
    mockGenerateUUID.mockReturnValue(mockUUID);

    // Act: Call the method under test
    const channel = await ChatService.createSupportChannel('user-abc');

    // Assert: Verify the outcomes
    expect(mockChatModel.createSupportChannel).toHaveBeenCalledWith('user-abc');
    expect(mockStaffService.assignStaffToChannel).toHaveBeenCalled();
    expect(mockChatModel.addMember).toHaveBeenCalledWith(
      mockChannel.id,
      mockStaffId,
      'admin'
    );
    expect(mockChatModel.createMessage).toHaveBeenCalledWith({
      client_msg_id: mockUUID,
      channel_id: mockChannel.id,
      sender_id: 'bot',
      body: 'Welcome to support! A staff member will be with you shortly.',
    });
    expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    expect(channel).toEqual(mockChannel);
  });

  it('should notify admins when no staff are available', async () => {
    const mockChannel = { id: 'channel-456', name: 'Support for user-def' };
    const mockAdmins = [{ userId: 'admin-1' }, { userId: 'admin-2' }];

    // Arrange: Set up the mock implementations
    mockChatModel.createSupportChannel.mockResolvedValue(mockChannel as any);
    mockStaffService.assignStaffToChannel.mockResolvedValue(null); // No staff available
    mockUserModel.findByRole.mockResolvedValue(mockAdmins as any);

    // Act: Call the method under test
    await ChatService.createSupportChannel('user-def');

    // Assert: Verify the outcomes
    expect(mockStaffService.assignStaffToChannel).toHaveBeenCalled();
    expect(mockChatModel.addMember).not.toHaveBeenCalled();
    expect(mockChatModel.createMessage).not.toHaveBeenCalled();
    expect(mockUserModel.findByRole).toHaveBeenCalledWith('admin');
    expect(mockNotificationService.sendToUser).toHaveBeenCalledTimes(2);
    expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
      'admin-1',
      'Support Request',
      `A user is waiting for support in channel ${mockChannel.id}.`
    );
    expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
      'admin-2',
      'Support Request',
      `A user is waiting for support in channel ${mockChannel.id}.`
    );
  });
});
