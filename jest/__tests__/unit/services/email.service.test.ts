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
      };
    });
    emailService = new EmailService();
  });

  it('should send a verification email', async () => {
    const email = 'test@example.com';
    const token = 'test-token';
    await emailService.sendVerificationEmail(email, token);

    expect(sendMailMock).toHaveBeenCalledWith(email, token);
  });

  it('should send a password reset email', async () => {
    const email = 'test@example.com';
    const resetToken = 'reset-token';
    await emailService.sendPasswordResetEmail(email, resetToken);

    expect(sendMailMock).toHaveBeenCalledWith(email, resetToken);
  });
});
