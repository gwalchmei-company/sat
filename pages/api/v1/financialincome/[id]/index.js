import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import financialIncome from "models/financial-income";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:financialincome"), getHandler);
router.patch(controller.canRequest("update:financialincome"), patchHandler);
router.delete(controller.canRequest("delete:financialincome"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const financialIncomeId = request.query.id;

  const financialIncomeFound =
    await financialIncome.findOneById(financialIncomeId);

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

  if (!canReadAll && canReadOwn) {
    if (financialIncomeFound.customer_id !== userLogged.id) {
      throw new ForbiddenError({
        message: "Você não possui permissão para acessar este recurso.",
        action:
          "Você só pode acessar receitas financeiras dos seus próprios aluguéis.",
      });
    }
  }

  return response.status(200).json(financialIncomeFound);
}

async function patchHandler(request, response) {
  const financialIncomeId = request.query.id;
  const insecureInput = request.body;

  const secureInputValues = authorization.filterInput(
    request.context.user,
    "update:financialincome",
    insecureInput,
  );

  const updatedFinancialIncome = await financialIncome.update(
    financialIncomeId,
    secureInputValues,
  );

  return response.status(200).json(updatedFinancialIncome);
}

async function deleteHandler(request, response) {
  const financialIncomeId = request.query.id;

  await financialIncome.Delete(financialIncomeId);

  return response.status(200).json({});
}
