import infra from "tests/orchestrator/infra.orchestrator.js";
import auth from "tests/orchestrator/auth.orchestrator.js";
import email from "tests/orchestrator/email.orchestrator.js";
import utils from "tests/orchestrator/utils.orchestator.js";

import device from "./domains/device.orchestrator.js";
import rental from "./domains/rental.orchestrator.js";
import financial from "./domains/financial.orchestrator.js";
import order from "./domains/order.orchestrator.js";

const orchestrator = {
  ...infra,
  ...auth,
  ...email,
  ...utils,
  ...device,
  ...rental,
  ...financial,
  ...order,
};

export default orchestrator;
