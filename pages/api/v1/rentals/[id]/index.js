import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import rental from "models/rental";
import { ForbiddenError } from "infra/errors";
import authorization from "models/authorization";
import { createEvent, eventDispatcher } from "infra/events";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:rentals"), getHandler);
router.patch(controller.canRequest("update:rentals"), patchHandler);
router.delete(controller.canRequest("delete:rentals"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const rentalId = request.query.id;

  const rentalFound = await rental.findOneById(rentalId);

  const canReadAll = authorization.can(userLogged, "read:rentals:others");

  if (!canReadAll && rentalFound.customer_id !== userLogged.id) {
    throw new ForbiddenError({
      message: "Você não possui permissão para visualizar este aluguel.",
      action: "Você só pode visualizar seus próprios aluguéis.",
    });
  }

  return response.status(200).json(rentalFound);
}

async function patchHandler(request, response) {
  const userLogged = request.context.user;
  const rentalId = request.query.id;
  const inputInsecure = request.body;

  const targetRental = await rental.findOneById(rentalId);

  const valuesFiltered = authorization.filterInput(
    userLogged,
    "update:rentals",
    inputInsecure,
    targetRental,
  );

  const updatedRental = await rental.update(rentalId, valuesFiltered);

  await eventDispatcher.dispatch(
    createEvent({
      type: "RENTAL_UPDATED",
      entity: "RENTAL",
      entityId: rentalId,
      payload: {
        updatedBy: userLogged.id,
        changes: valuesFiltered,
      },
    }),
  );

  return response.status(200).json(updatedRental);
}

async function deleteHandler(request, response) {
  const rentalId = request.query.id;

  await rental.remove(rentalId);

  return response.status(200).json({});
}
