import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization";
import rental from "models/rental";
import { ForbiddenError } from "infra/errors";
import rentalFinancials from "models/rental-financials";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const rentalId = request.query.id;
  const rentalFounded = await rental.findOneById(rentalId);

  const canReadAll = authorization.can(
    userLogged,
    "read:financialincome:others",
  );
  const canReadSelf = authorization.can(
    userLogged,
    "read:financialincome:self",
    rentalFounded,
  );

  if (!canReadAll && !canReadSelf) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:financialincome" ou "read:financialincome:self".',
    });
  }

  const paymentStatus = await rentalFinancials.checkPaymentStatus(
    rentalFounded.id,
  );
  return response.status(200).json(paymentStatus);
}
