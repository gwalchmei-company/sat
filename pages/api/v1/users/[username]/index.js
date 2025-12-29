import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import user from "models/user.js";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:user"), getHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const { username } = request.query;

  const targetUser =
    username === userLogged.username
      ? userLogged
      : await user.findOneByUsername(username);

  if (!authorization.can(userLogged, "read:user", targetUser)) {
    throw new ForbiddenError({
      message: "Você não possui permissão para ler este usuário.",
      action: 'Verifique a feature "read:user" ou "read:user:others".',
    });
  }

  return response.status(200).json(targetUser);
}

async function patchHandler(request, response) {
  const username = request.query.username;
  const userInputValues = request.body;

  const updatedUser = await user.update(username, userInputValues);
  return response.status(200).json(updatedUser);
}
