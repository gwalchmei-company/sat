import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rental from "models/rental";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:rentals"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const rentalId = request.query.id;

  const rentalFound = await rental.findOneById(rentalId);

  const canReadAll = authorization.can(userLogged, "read:rentals:others");

  if (!canReadAll && rentalFound.customer_id !== userLogged.id) {
    throw new ForbiddenError({
      message: "Você não possui permissão para visualizar este aluguel.",
      action: "Você só pode visualizar seus próprios aluguéis.",
    });
  }

  return response.status(200).json(rentalFound);
}
