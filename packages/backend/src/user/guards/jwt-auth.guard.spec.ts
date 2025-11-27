import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const user = { id: '1', email: 'test@example.com' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when token is expired', () => {
      const info = { name: 'TokenExpiredError' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Token has expired')
      );
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      const info = { name: 'JsonWebTokenError' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should throw UnauthorizedException when no token provided', () => {
      const info = { message: 'No auth token' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('No authentication token provided')
      );
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        new UnauthorizedException('Unauthorized access')
      );
    });

    it('should throw error when error is provided', () => {
      const error = new Error('Custom error');
      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
    });
  });

  describe('canActivate', () => {
    it('should call super.canActivate', () => {
      const context = {} as ExecutionContext;
      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalledWith(context);
      superSpy.mockRestore();
    });
  });
});
