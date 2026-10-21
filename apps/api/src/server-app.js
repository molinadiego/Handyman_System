import { createApp } from './app.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createWorkspaceController } from './controllers/workspace.controller.js';
import { createOwnedWorkspaceMiddleware, createOwnerSessionMiddleware } from './middleware/owner-session.js';
import { createSameOriginMiddleware } from './middleware/same-origin.js';
import { createPrismaAuthRepository } from './repositories/prisma-auth.repository.js';
import { prisma } from './repositories/prisma-client.js';
import { createPrismaWorkspaceRepository } from './repositories/prisma-workspace.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createDatabaseReadinessRouter } from './routes/database-readiness.routes.js';
import { createWorkspaceRouter } from './routes/workspace.routes.js';
import { createAuthService } from './services/auth.service.js';
import { EmailService } from './services/email.service.js';
import { passwordHasher } from './services/password-hasher.js';
import { ResendEmailTransport } from './services/resend-email.transport.js';
import { createWorkspaceService } from './services/workspace.service.js';

const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
const authRepository = createPrismaAuthRepository(prisma);
const workspaceRepository = createPrismaWorkspaceRepository(prisma);
const sameOriginMiddleware = createSameOriginMiddleware(appBaseUrl);
const ownerSessionMiddleware = createOwnerSessionMiddleware({ sessionRepository: authRepository });
const ownedWorkspaceMiddleware = createOwnedWorkspaceMiddleware({ workspaceRepository });

const authService = createAuthService({
  repository: authRepository,
  passwordHasher,
  emailService: new EmailService(new ResendEmailTransport()),
  frontendBaseUrl: appBaseUrl,
});
const workspaceService = createWorkspaceService({ workspaceRepository });

const authRouter = createAuthRouter({
  controller: createAuthController({ authService }),
  sameOriginMiddleware,
  ownerSessionMiddleware,
});
const workspaceRouter = createWorkspaceRouter({
  controller: createWorkspaceController({ workspaceService }),
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});

export const app = createApp({
  authRouter,
  workspaceRouter,
  databaseReadinessRouter: createDatabaseReadinessRouter(prisma),
});
