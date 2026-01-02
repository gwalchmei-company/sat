import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import customerOrder from "models/customer-order";
import { ForbiddenError } from "infra/errors";
import user from "models/user";
import authorization from "models/authorization";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:orders"), postHandler);
router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userLogged = request.context.user;
  const inputInsecure = request.body;
  const targetCustomer =
    inputInsecure.customer_id === userLogged.id
      ? userLogged
      : await user.findOneById(inputInsecure.customer_id);

  const valuesFiltered = authorization.filterInput(
    userLogged,
    "create:orders",
    inputInsecure,
  );

  if (!authorization.can(userLogged, "create:orders", targetCustomer)) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action: 'Verifique a feature "create:orders" ou "create:orders:others".',
    });
  }

  const createdRental = await customerOrder.create(valuesFiltered);

  return response.status(201).json(createdRental);
}

async function getHandler(request, response) {
  const userLogged = request.context.user;

  const canReadAll = authorization.can(userLogged, "read:orders");
  const canReadOwn = authorization.can(userLogged, "read:orders:self");

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action: 'Verifique a feature "read:orders" ou "read:orders:self".',
    });
  }

  let ordersList;

  if (canReadAll) {
    ordersList = await customerOrder.listAll();
  } else {
    ordersList = await customerOrder.listByCustomerId(userLogged.id);
  }

  return response.status(200).json(ordersList);
}
