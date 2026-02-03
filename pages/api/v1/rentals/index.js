import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rental from "models/rental";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";
import customerOrder from "models/customer-order";
import { createEvent, eventDispatcher } from "infra/events";
import user from "models/user";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:rentals"), postHandler);
router.get(controller.canRequest("read:rentals"), getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const rentalInputValues = request.body;
  const rentalCreated = await rental.create(rentalInputValues);

  if (rentalCreated.customer_order_id) {
    const order = await customerOrder.update(rentalCreated.customer_order_id, {
      status: "approved",
    });

    const customer = await user.findOneById(rentalCreated.customer_id);

    await eventDispatcher.dispatch(
      createEvent({
        type: "ORDER_APPROVED",
        entity: "RENTAL",
        entityId: rentalCreated.id,
        payload: {
          order,
          rental: rentalCreated,
          customer,
          approved_by: request.context.user,
        },
      }),
    );
  }

  return response.status(201).json(rentalCreated);
}

async function getHandler(request, response) {
  const userLogged = request.context.user;

  const canReadAll = authorization.can(userLogged, "read:rentals:others");
  const canReadOwn = authorization.can(userLogged, "read:rentals:self");

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:rentals:others" ou "read:rentals:self".',
    });
  }

  let rentalsList;

  if (canReadAll) {
    rentalsList = await rental.listAll();
  } else {
    rentalsList = await rental.listByCustomerId(userLogged.id);
  }

  return response.status(200).json(rentalsList);
}
