import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rentalFinancials from "models/rental-financials";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:rentalfinancials"), getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const rentalFinancialId = request.query.id;

  const rentalFinancial = await rentalFinancials.findOneById(rentalFinancialId);

  const canReadAll = authorization.can(
    userLogged,
    "read:rentalfinancials:others",
  );
  const canReadOwn = authorization.can(
    userLogged,
    "read:rentalfinancials:self",
  );

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:rentalfinancials:others" ou "read:rentalfinancials:self".',
    });
  }

  if (!canReadAll && canReadOwn) {
    if (rentalFinancial.customer_id !== userLogged.id) {
      throw new ForbiddenError({
        message: "Você não possui permissão para acessar este recurso.",
        action:
          "Você só pode acessar registros financeiros dos seus próprios aluguéis.",
      });
    }
  }

  return response.status(200).json(rentalFinancial);
}
