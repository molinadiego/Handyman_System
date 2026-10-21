import {
  clearSessionCookie,
  readOwnerSessionToken,
  serializeSessionCookie,
} from '../middleware/owner-session.js';

export function createAuthController({ authService, cookieOptions = {} }) {
  return {
    register: async (request, response) => {
      const result = await authService.registerOwner(request.body ?? {});
      response.status(202).json(result);
    },

    verifyEmail: async (request, response) => {
      const result = await authService.verifyOwnerEmail(request.body?.token);
      response.status(200).json({ data: result });
    },

    login: async (request, response) => {
      const result = await authService.loginOwner(request.body ?? {});
      response.setHeader('Set-Cookie', serializeSessionCookie(result.sessionToken, cookieOptions));
      response.status(200).json({ data: result.user });
    },

    getSession: (request, response) => {
      response.status(200).json({
        data: {
          id: request.auth.userId,
          email: request.auth.email,
          preferredLanguage: request.auth.preferredLanguage,
        },
      });
    },

    updateLanguage: async (request, response) => {
      const data = await authService.updateOwnerLanguage({
        userId: request.auth.userId,
        preferredLanguage: request.body?.preferredLanguage,
      });
      response.status(200).json({ data });
    },

    requestPasswordReset: async (request, response) => {
      const result = await authService.requestPasswordReset(request.body?.email);
      response.status(202).json(result);
    },

    resetPassword: async (request, response) => {
      const result = await authService.resetOwnerPassword(request.body ?? {});
      response.status(200).json(result);
    },

    logout: async (request, response) => {
      await authService.logoutOwner(readOwnerSessionToken(request));
      response.setHeader('Set-Cookie', clearSessionCookie(cookieOptions));
      response.status(204).end();
    },
  };
}
