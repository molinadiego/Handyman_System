import { createApp } from './app.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createCrmController } from './controllers/crm.controller.js';
import { createEstimateController } from './controllers/estimate.controller.js';
import { createWorkspaceController } from './controllers/workspace.controller.js';
import { createOwnedWorkspaceMiddleware, createOwnerSessionMiddleware } from './middleware/owner-session.js';
import { createSameOriginMiddleware } from './middleware/same-origin.js';
import { createPrismaAuthRepository } from './repositories/prisma-auth.repository.js';
import { createPrismaCrmRepository } from './repositories/prisma-crm.repository.js';
import { createPrismaEstimateRepository } from './repositories/prisma-estimate.repository.js';
import { prisma } from './repositories/prisma-client.js';
import { createPrismaWorkspaceRepository } from './repositories/prisma-workspace.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createCrmRouter } from './routes/crm.routes.js';
import { createEstimateRouter, createPublicEstimateRouter } from './routes/estimate.routes.js';
import { createDatabaseReadinessRouter } from './routes/database-readiness.routes.js';
import { createWorkspaceRouter } from './routes/workspace.routes.js';
import { createAuthService } from './services/auth.service.js';
import { createCrmService } from './services/crm.service.js';
import { createEstimateService } from './services/estimate.service.js';
import { EmailService } from './services/email.service.js';
import { passwordHasher } from './services/password-hasher.js';
import { ResendEmailTransport } from './services/resend-email.transport.js';
import { createPropertyAccessCrypto } from './services/property-access-crypto.js';
import { createWorkspaceService } from './services/workspace.service.js';

const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
const authRepository = createPrismaAuthRepository(prisma);
const crmRepository = createPrismaCrmRepository(prisma);
const estimateRepository = createPrismaEstimateRepository(prisma);
const workspaceRepository = createPrismaWorkspaceRepository(prisma);
const sameOriginMiddleware = createSameOriginMiddleware(appBaseUrl);
const ownerSessionMiddleware = createOwnerSessionMiddleware({ sessionRepository: authRepository });
const ownedWorkspaceMiddleware = createOwnedWorkspaceMiddleware({ workspaceRepository });
const emailService = new EmailService(new ResendEmailTransport());

const authService = createAuthService({
  repository: authRepository,
  passwordHasher,
  emailService,
  frontendBaseUrl: appBaseUrl,
});
const workspaceService = createWorkspaceService({ workspaceRepository });
const crmService = createCrmService({
  repository: crmRepository,
  accessCrypto: createPropertyAccessCrypto(),
});
const estimateService = createEstimateService({
  estimateRepository,
  crmRepository,
  emailService,
  frontendBaseUrl: appBaseUrl,
});

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
const crmRouter = createCrmRouter({
  controller: createCrmController({ crmService }),
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const estimateController = createEstimateController({ estimateService });
const estimateRouter = createEstimateRouter({
  controller: estimateController,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const publicEstimateRouter = createPublicEstimateRouter({ controller: estimateController, sameOriginMiddleware });

export const app = createApp({
  authRouter,
  workspaceRouter,
  crmRouter,
  estimateRouter,
  publicEstimateRouter,
  databaseReadinessRouter: createDatabaseReadinessRouter(prisma),
});
