import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import customerOrder from "models/customer-order";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";
import { createEvent, eventDispatcher } from "infra/events";
import user from "models/user";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(getHandler);
router.patch(controller.canRequest("update:orders"), patchHandler);
router.delete(controller.canRequest("delete:orders"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const orderRequestsId = request.query.id;

  const targetOrder = await customerOrder.findOneById(orderRequestsId);

  if (!authorization.can(userLogged, "read:orders")) {
    if (!authorization.can(userLogged, "read:orders:self", targetOrder)) {
      throw new ForbiddenError({
        message: "Você não possui permissão para executar essa ação.",
        action: 'Verifique a feature "read:orders" ou "read:orders:self".',
      });
    }
  }

  return response.status(200).json(targetOrder);
}

async function patchHandler(request, response) {
  const userLogged = request.context.user;
  const orderRequestsId = request.query.id;
  const inputInsecure = request.body;

  const targetOrder = await customerOrder.findOneById(orderRequestsId);

  const canUpdateAll = authorization.can(userLogged, "update:orders:others");
  const canUpdateOwn = authorization.can(
    userLogged,
    "update:orders:self",
    targetOrder,
  );

  if (!canUpdateAll && !canUpdateOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "update:orders:others" ou "update:orders:self".',
    });
  }

  const feature = canUpdateAll ? "update:orders:others" : "update:orders:self";
  const valuesFiltered = authorization.filterInput(
    userLogged,
    feature,
    inputInsecure,
    targetOrder,
  );

  const updatedOrder = await customerOrder.update(
    orderRequestsId,
    valuesFiltered,
  );

  if (
    valuesFiltered.status &&
    valuesFiltered.status !== targetOrder.status &&
    updatedOrder.customer_id
  ) {
    const customer = await user.findOneById(updatedOrder.customer_id);

    await eventDispatcher.dispatch(
      createEvent({
        type: "ORDER_STATUS_CHANGED",
        entity: "CUSTOMER_ORDER",
        entityId: updatedOrder.id,
        payload: {
          customer,
          previousStatus: targetOrder.status,
          newStatus: valuesFiltered.status,
          order: updatedOrder,
          changedBy: userLogged,
        },
      }),
    );
  }

  return response.status(200).json(updatedOrder);
}

async function deleteHandler(request, response) {
  const userLogged = request.context.user;
  const orderRequestsId = request.query.id;
  const targetOrder = await customerOrder.findOneById(orderRequestsId);
  const isCompleted = targetOrder.status === "completed";

  const canDeleteCompleted = authorization.can(
    userLogged,
    "delete:orders:completed",
  );

  if (isCompleted && !canDeleteCompleted) {
    throw new ForbiddenError({
      message: "Pedidos concluídos não podem ser excluídos.",
      action: "Entre em contato caso precise de ajuda.",
    });
  }

  await customerOrder.Delete(targetOrder.id);

  return response.status(200).end();
}
