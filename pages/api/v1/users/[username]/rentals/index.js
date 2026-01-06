import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rental from "models/rental";
import user from "models/user";
import authorization from "models/authorization";
import { ValidationError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:rentals"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const authenticatedUser = request.context.user;
  const username = request.query.username;

  if (!username) {
    throw new ValidationError({
      message: "O username não foi informado.",
      action: "Informe o username e tente novamente.",
    });
  }

  const targetUser = await user.findOneByUsername(username);

  if (
    !authorization.can(authenticatedUser, "read:rentals:others", targetUser)
  ) {
    if (
      !authorization.can(authenticatedUser, "read:rentals:self", targetUser)
    ) {
      throw new ValidationError({
        message: "Você não possui permissão para visualizar esses aluguéis.",
        action: "Entre em contato com o suporte caso precise de ajuda.",
      });
    }
    if (authenticatedUser.id !== targetUser.id) {
      throw new ValidationError({
        message: "Você não possui permissão para visualizar esses aluguéis.",
        action: "Você só pode visualizar seus próprios aluguéis.",
      });
    }
  }

  const rentalsList = await rental.listByCustomerId(targetUser.id);

  return response.status(200).json(rentalsList);
}
