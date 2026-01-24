import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import contract from "models/contract";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("cancel:contracts"), postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userLogged = request.context.user;
  const contractId = request.query.id;
  const { cancel_reason, canceled_at } = request.body;

  const canCancelAll = authorization.can(userLogged, "cancel:contracts:others");
  const canCancelOwn = authorization.can(userLogged, "cancel:contracts:self");

  if (!canCancelAll && !canCancelOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "cancel:contracts:others" ou "cancel:contracts:self".',
    });
  }

  if (!canCancelAll && canCancelOwn) {
    await contract.findOneByIdAndCustomerId(contractId, userLogged.id);
  }

  const canceledContract = await contract.cancel(contractId, userLogged.id, {
    cancel_reason,
    canceled_at,
  });

  return response.status(200).json(canceledContract);
}
