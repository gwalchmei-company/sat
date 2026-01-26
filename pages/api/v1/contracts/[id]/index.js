import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import contract from "models/contract";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";
import { createEvent, eventDispatcher } from "infra/events";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.get(controller.canRequest("read:contracts"), getHandler);
router.patch(controller.canRequest("update:contracts"), patchHandler);
router.delete(controller.canRequest("delete:contracts"), deleteHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const userLogged = request.context.user;
  const contractId = request.query.id;

  const canReadAll = authorization.can(userLogged, "read:contracts:others");
  const canReadOwn = authorization.can(userLogged, "read:contracts:self");

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:contracts:others" ou "read:contracts:self".',
    });
  }

  let contractFound;

  if (canReadAll) {
    contractFound = await contract.findOneById(contractId);
  } else {
    contractFound = await contract.findOneByIdAndCustomerId(
      contractId,
      userLogged.id,
    );
  }

  return response.status(200).json(contractFound);
}

async function patchHandler(request, response) {
  const contractId = request.query.id;
  const contractData = request.body;

  const contractUpdated = await contract.update(contractId, contractData);

  await eventDispatcher.dispatch(
    createEvent({
      type: "CONTRACT_UPDATED",
      entity: "CONTRACT",
      entityId: contractUpdated.id,
      payload: {
        contract: contractUpdated,
      },
    }),
  );

  return response.status(200).json(contractUpdated);
}

async function deleteHandler(request, response) {
  const userLogged = request.context.user;
  const contractId = request.query.id;

  const contractDeleted = await contract.delete(contractId, userLogged.id);

  return response.status(200).json(contractDeleted);
}
