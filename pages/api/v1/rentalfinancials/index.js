import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rentalFinancials from "models/rental-financials";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:rentalfinancials"), postHandler);
router.get(controller.canRequest("read:rentalfinancials"), getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const rentalFinancialInputValues = request.body;
  const rentalFinancialCreated = await rentalFinancials.create(
    rentalFinancialInputValues,
  );
  return response.status(201).json(rentalFinancialCreated);
}

async function getHandler(request, response) {
  const userLogged = request.context.user;

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

  let rentalFinancialsList;

  if (canReadAll) {
    rentalFinancialsList = await rentalFinancials.listAll();
  } else {
    rentalFinancialsList = await rentalFinancials.listByCustomerId(
      userLogged.id,
    );
  }

  return response.status(200).json(rentalFinancialsList);
}
