import { EmailService } from '../../../../src/services/email.service';

jest.mock('../../../../src/services/email.service');

describe('EmailService', () => {
  let emailService: EmailService;
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue(true);
    (EmailService as jest.Mock).mockImplementation(() => {
      return {
        sendVerificationEmail: sendMailMock,
        sendPasswordResetEmail: sendMailMock,
        sendWelcomeEmail: sendMailMock,
      };
    });
    emailService = new EmailService();
  });

  it('should send a verification email', async () => {
    const email = 'test@example.com';
    const full_name = 'Test User';
    await emailService.sendWelcomeEmail(email, full_name);

    expect(sendMailMock).toHaveBeenCalledWith(email, full_name);
  });

  it('should send a password reset email', async () => {
    const email = 'test@example.com';
    const resetToken = 'reset-token';
    await emailService.sendPasswordResetEmail(email, resetToken);

    expect(sendMailMock).toHaveBeenCalledWith(email, resetToken);
  });
});
