import { Router } from 'express';

export function createAuthRouter({ controller, sameOriginMiddleware, ownerSessionMiddleware }) {
  const router = Router();

  router.post('/register', sameOriginMiddleware, controller.register);
  router.post('/verify-email', sameOriginMiddleware, controller.verifyEmail);
  router.post('/login', sameOriginMiddleware, controller.login);
  router.get('/session', ownerSessionMiddleware, controller.getSession);
  router.patch('/preferences/language', sameOriginMiddleware, ownerSessionMiddleware, controller.updateLanguage);
  router.post('/password-reset/request', sameOriginMiddleware, controller.requestPasswordReset);
  router.post('/password-reset/complete', sameOriginMiddleware, controller.resetPassword);
  router.post('/logout', sameOriginMiddleware, controller.logout);

  return router;
}
