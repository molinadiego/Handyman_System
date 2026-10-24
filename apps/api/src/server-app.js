import { createApp } from './app.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createCrmController } from './controllers/crm.controller.js';
import { createEmployeeController } from './controllers/employee.controller.js';
import { createEstimateController } from './controllers/estimate.controller.js';
import { createWorkOrderController } from './controllers/work-order.controller.js';
import { createWorkOrderAssignmentController } from './controllers/work-order-assignment.controller.js';
import { createWorkOrderActualsController } from './controllers/work-order-actuals.controller.js';
import { createWorkOrderSchedulingController } from './controllers/work-order-scheduling.controller.js';
import { createOfflineProgressController } from './controllers/offline-progress.controller.js';
import { createWorkOrderMediaController } from './controllers/work-order-media.controller.js';
import { createAdditionalWorkController } from './controllers/additional-work.controller.js';
import { createWorkspaceController } from './controllers/workspace.controller.js';
import { createOwnedWorkspaceMiddleware, createOwnerSessionMiddleware } from './middleware/owner-session.js';
import { createSameOriginMiddleware } from './middleware/same-origin.js';
import { createPrismaAuthRepository } from './repositories/prisma-auth.repository.js';
import { createPrismaCrmRepository } from './repositories/prisma-crm.repository.js';
import { createPrismaEmployeeRepository } from './repositories/prisma-employee.repository.js';
import { createPrismaEstimateRepository } from './repositories/prisma-estimate.repository.js';
import { createPrismaWorkOrderAssignmentRepository } from './repositories/prisma-work-order-assignment.repository.js';
import { createPrismaWorkOrderActualsRepository } from './repositories/prisma-work-order-actuals.repository.js';
import { createPrismaWorkOrderSchedulingRepository } from './repositories/prisma-work-order-scheduling.repository.js';
import { createPrismaOfflineProgressRepository } from './repositories/prisma-offline-progress.repository.js';
import { createNeonWorkOrderMediaStore } from './repositories/neon-work-order-media.store.js';
import { createPrismaWorkOrderMediaRepository } from './repositories/prisma-work-order-media.repository.js';
import { createPrismaAdditionalWorkRepository } from './repositories/prisma-additional-work.repository.js';
import { createPrismaWorkOrderRepository } from './repositories/prisma-work-order.repository.js';
import { prisma } from './repositories/prisma-client.js';
import { createPrismaWorkspaceRepository } from './repositories/prisma-workspace.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createCrmRouter } from './routes/crm.routes.js';
import { createAssignedWorkOrderRouter, createEmployeeRouter, createWorkOrderAssignmentRouter } from './routes/employee.routes.js';
import { createEstimateRouter, createPublicEstimateRouter } from './routes/estimate.routes.js';
import { createWorkOrderRouter } from './routes/work-order.routes.js';
import { createWorkOrderActualsRouter } from './routes/work-order-actuals.routes.js';
import { createPublicScheduleChangeRouter, createWorkOrderSchedulingRouter } from './routes/work-order-scheduling.routes.js';
import { createEmployeeOfflineSyncRouter, createOwnerOfflineProgressRouter } from './routes/offline-progress.routes.js';
import { createEmployeeWorkOrderMediaRouter, createOwnerWorkOrderMediaRouter } from './routes/work-order-media.routes.js';
import { createAdditionalWorkRouter } from './routes/additional-work.routes.js';
import { createDatabaseReadinessRouter } from './routes/database-readiness.routes.js';
import { createWorkspaceRouter } from './routes/workspace.routes.js';
import { createAuthService } from './services/auth.service.js';
import { createCrmService } from './services/crm.service.js';
import { createEmployeeService } from './services/employee.service.js';
import { createEstimateService } from './services/estimate.service.js';
import { createWorkOrderService } from './services/work-order.service.js';
import { createWorkOrderAssignmentService } from './services/work-order-assignment.service.js';
import { createWorkOrderActualsService } from './services/work-order-actuals.service.js';
import { createWorkOrderSchedulingService } from './services/work-order-scheduling.service.js';
import { createOfflineProgressService } from './services/offline-progress.service.js';
import { createWorkOrderMediaService } from './services/work-order-media.service.js';
import { createAdditionalWorkService } from './services/additional-work.service.js';
import { EmailService } from './services/email.service.js';
import { passwordHasher } from './services/password-hasher.js';
import { ResendEmailTransport } from './services/resend-email.transport.js';
import { createPropertyAccessCrypto } from './services/property-access-crypto.js';
import { createWorkspaceService } from './services/workspace.service.js';

const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
const authRepository = createPrismaAuthRepository(prisma);
const crmRepository = createPrismaCrmRepository(prisma);
const employeeRepository = createPrismaEmployeeRepository(prisma);
const estimateRepository = createPrismaEstimateRepository(prisma);
const workOrderRepository = createPrismaWorkOrderRepository(prisma);
const actualsRepository = createPrismaWorkOrderActualsRepository(prisma);
const schedulingRepository = createPrismaWorkOrderSchedulingRepository(prisma);
const offlineProgressRepository = createPrismaOfflineProgressRepository(prisma);
const mediaRepository = createPrismaWorkOrderMediaRepository(prisma);
const mediaStore = createNeonWorkOrderMediaStore();
const additionalWorkRepository = createPrismaAdditionalWorkRepository(prisma);
const assignmentRepository = createPrismaWorkOrderAssignmentRepository(prisma);
const workspaceRepository = createPrismaWorkspaceRepository(prisma);
const sameOriginMiddleware = createSameOriginMiddleware(appBaseUrl);
const ownerSessionMiddleware = createOwnerSessionMiddleware({ sessionRepository: authRepository });
const ownedWorkspaceMiddleware = createOwnedWorkspaceMiddleware({ workspaceRepository });
const emailService = new EmailService(new ResendEmailTransport());
const propertyAccessCrypto = createPropertyAccessCrypto();

const authService = createAuthService({
  repository: authRepository,
  passwordHasher,
  emailService,
  frontendBaseUrl: appBaseUrl,
});
const workspaceService = createWorkspaceService({ workspaceRepository });
const crmService = createCrmService({
  repository: crmRepository,
  accessCrypto: propertyAccessCrypto,
});
const employeeService = createEmployeeService({ employeeRepository });
const estimateService = createEstimateService({
  estimateRepository,
  crmRepository,
  emailService,
  frontendBaseUrl: appBaseUrl,
});
const workOrderService = createWorkOrderService({
  workOrderRepository,
  estimateRepository,
  crmRepository,
});
const workOrderAssignmentService = createWorkOrderAssignmentService({
  assignmentRepository,
  crmRepository,
  emailService,
  accessCrypto: propertyAccessCrypto,
  frontendBaseUrl: appBaseUrl,
});
const actualsService = createWorkOrderActualsService({
  actualsRepository,
  workOrderRepository,
  employeeRepository,
});
const schedulingService = createWorkOrderSchedulingService({
  schedulingRepository,
  workOrderRepository,
  emailService,
  frontendBaseUrl: appBaseUrl,
});
const offlineProgressService = createOfflineProgressService({ offlineProgressRepository, workOrderRepository });
const mediaService = createWorkOrderMediaService({ mediaRepository, workOrderRepository, assignmentRepository, mediaStore });
const additionalWorkService = createAdditionalWorkService({ additionalWorkRepository, workOrderRepository });

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
const workOrderRouter = createWorkOrderRouter({
  controller: createWorkOrderController({ workOrderService }),
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const workOrderActualsRouter = createWorkOrderActualsRouter({
  controller: createWorkOrderActualsController({ actualsService }),
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const schedulingController = createWorkOrderSchedulingController({ schedulingService });
const workOrderSchedulingRouter = createWorkOrderSchedulingRouter({
  controller: schedulingController,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const publicScheduleChangeRouter = createPublicScheduleChangeRouter({ controller: schedulingController, sameOriginMiddleware });
const offlineProgressController = createOfflineProgressController({ offlineProgressService });
const ownerOfflineProgressRouter = createOwnerOfflineProgressRouter({
  controller: offlineProgressController,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const employeeOfflineSyncRouter = createEmployeeOfflineSyncRouter({
  controller: offlineProgressController,
  sameOriginMiddleware,
});
const mediaController = createWorkOrderMediaController({ mediaService });
const workOrderMediaRouter = createOwnerWorkOrderMediaRouter({
  controller: mediaController,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const employeeWorkOrderMediaRouter = createEmployeeWorkOrderMediaRouter({
  controller: mediaController,
  sameOriginMiddleware,
});
const additionalWorkRouter = createAdditionalWorkRouter({
  controller: createAdditionalWorkController({ additionalWorkService }),
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const employeeRouter = createEmployeeRouter({
  controller: createEmployeeController({ employeeService }),
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const assignmentController = createWorkOrderAssignmentController({ assignmentService: workOrderAssignmentService });
const workOrderAssignmentRouter = createWorkOrderAssignmentRouter({
  controller: assignmentController,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
});
const assignedWorkOrderRouter = createAssignedWorkOrderRouter({
  controller: assignmentController,
  sameOriginMiddleware,
});

export const app = createApp({
  authRouter,
  workspaceRouter,
  crmRouter,
  employeeRouter,
  estimateRouter,
  workOrderRouter,
  workOrderActualsRouter,
  workOrderMediaRouter,
  employeeWorkOrderMediaRouter,
  workOrderSchedulingRouter,
  publicScheduleChangeRouter,
  ownerOfflineProgressRouter,
  employeeOfflineSyncRouter,
  additionalWorkRouter,
  workOrderAssignmentRouter,
  assignedWorkOrderRouter,
  publicEstimateRouter,
  databaseReadinessRouter: createDatabaseReadinessRouter(prisma),
});
