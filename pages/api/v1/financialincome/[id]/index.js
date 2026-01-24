import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import financialIncome from "models/financial-income";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:financialincome"), getHandler);

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
