import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import contract from "models/contract";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";
import { createEvent, eventDispatcher } from "infra/events";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("sign:contracts"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userLogged = request.context.user;
  const contractId = request.query.id;

  const canSignAll = authorization.can(userLogged, "sign:contracts:others");
  const canSignOwn = authorization.can(userLogged, "sign:contracts:self");

  if (!canSignAll && !canSignOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "sign:contracts:others" ou "sign:contracts:self".',
    });
  }

  if (!canSignAll && canSignOwn) {
    await contract.findOneByIdAndCustomerId(contractId, userLogged.id);
  }

  const signedContract = await contract.sign(contractId, userLogged.id);

  await eventDispatcher.dispatch(
    createEvent({
      type: "CONTRACT_SIGNED",
      entity: "CONTRACT",
      entityId: signedContract.id,
      payload: {
        signedContract,
      },
    }),
  );

  return response.status(200).json(signedContract);
}
