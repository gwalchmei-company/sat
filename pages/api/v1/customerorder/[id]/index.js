import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import customerOrder from "models/customer-order";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const orderRequestsId = request.query.id;

  const targetOrder = await customerOrder.findOneById(orderRequestsId);

  if (!authorization.can(userLogged, "read:orders")) {
    if (!authorization.can(userLogged, "read:orders:self", targetOrder)) {
      throw new ForbiddenError({
        message: "Você não possui permissão para executar essa ação.",
        action: 'Verifique a feature "read:orders" ou "read:orders:self".',
      });
    }
  }

  return response.status(200).json(targetOrder);
}
