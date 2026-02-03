import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization";
import rentalModel from "models/rental";
import financialIncome from "models/financial-income";
import { ForbiddenError, NotFoundError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const rentalId = request.query.id;

  const canReadAll = authorization.can(
    userLogged,
    "read:financialincome:others",
  );
  const canReadSelf = authorization.can(
    userLogged,
    "read:financialincome:self",
  );

  if (!canReadAll && !canReadSelf) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:financialincome" ou "read:financialincome:self".',
    });
  }

  // If user can read all, return incomes for rental
  if (canReadAll) {
    const incomes = await financialIncome.listByRentalId(rentalId);
    return response.status(200).json(incomes);
  }

  // canReadSelf: ensure rental belongs to user
  const rental = await rentalModel.findOneById(rentalId);
  if (rental.customer_id !== userLogged.id) {
    // follow pattern: hide existence -> NotFound
    throw new NotFoundError({
      message: "O aluguel não foi encontrado.",
      action: "Verifique o id informado e tente novamente.",
    });
  }

  const incomes = await financialIncome.listByRentalId(rentalId);
  return response.status(200).json(incomes);
}
