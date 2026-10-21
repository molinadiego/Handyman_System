import { Router } from 'express';

export function createWorkspaceRouter({
  controller,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
}) {
  const router = Router();

  router.get('/', ownerSessionMiddleware, controller.list);
  router.post('/', sameOriginMiddleware, ownerSessionMiddleware, controller.create);
  router.get('/:workspaceId', ownerSessionMiddleware, ownedWorkspaceMiddleware, (request, response) => {
    response.status(200).json({ data: request.workspace });
  });

  return router;
}
