import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import contract from "models/contract";
import authorization from "models/authorization";
import { ForbiddenError } from "infra/errors";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.post(controller.canRequest("create:contracts"), postHandler);
router.get(controller.canRequest("read:contracts"), getHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const contractInputValues = request.body;

  const contractCreated = await contract.create(contractInputValues);
  return response.status(201).json(contractCreated);
}

async function getHandler(request, response) {
  const userLogged = request.context.user;

  const canReadAll = authorization.can(userLogged, "read:contracts:others");
  const canReadOwn = authorization.can(userLogged, "read:contracts:self");

  if (!canReadAll && !canReadOwn) {
    throw new ForbiddenError({
      message: "Você não possui permissão para executar essa ação.",
      action:
        'Verifique a feature "read:contracts:others" ou "read:contracts:self".',
    });
  }

  let contractsList;

  if (canReadAll) {
    contractsList = await contract.listAll();
  } else {
    contractsList = await contract.listByCustomerId(userLogged.id);
  }

  return response.status(200).json(contractsList);
}
