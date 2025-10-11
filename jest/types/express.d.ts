declare global {
  namespace Express {
    interface Request {
      getClientIP(): string;
    }
  }
}
