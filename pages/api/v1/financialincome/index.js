import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import financialIncome from "models/financial-income";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";
import { createEvent, eventDispatcher } from "infra/events";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:financialincome"), postHandler);
router.get(controller.canRequest("read:financialincome"), getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const financialIncomeInputValues = request.body;

  const financialIncomeCreated = await financialIncome.create(
    financialIncomeInputValues,
  );

  await eventDispatcher.dispatch(
    createEvent({
      type: "FINANCIALINCOME_CREATED",
      entity: "FINANCIALINCOME",
      entityId: financialIncomeCreated.id,
      payload: {
        financialIncome: financialIncomeCreated,
        performedBy: request.context.user || null,
      },
    }),
  );

  return response.status(201).json(financialIncomeCreated);
}

async function getHandler(request, response) {
  const userLogged = request.context.user;

  const canReadAll = authorization.can(
    userLogged,
    "read:financialincome:others",
  );
  const canReadOwn = authorization.can(userLogged, "read:financialincome:self");

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:financialincome:others" ou "read:financialincome:self".',
    });
  }

  let financialIncomeList;

  if (canReadAll) {
    financialIncomeList = await financialIncome.listAll();
  } else {
    financialIncomeList = await financialIncome.listByCustomerId(userLogged.id);
  }

  return response.status(200).json(financialIncomeList);
}
