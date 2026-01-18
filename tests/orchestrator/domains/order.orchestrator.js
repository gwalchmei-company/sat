import { faker } from "@faker-js/faker/";
import customerOrder from "models/customer-order";
import authOrchestrator from "../auth.orchestrator.js";

async function createCustomerOrder(orderObject) {
  const createdUser = await authOrchestrator.createAuthenticatedUser();
  const createdOrder = await customerOrder.create({
    customer_id: orderObject?.customer_id || createdUser.user.id,
    start_date: orderObject?.start_date || new Date().toISOString(),
    end_date:
      orderObject?.end_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: orderObject?.status || "pending",
    notes: orderObject?.notes || faker.lorem.sentence(),
    location_refer:
      orderObject?.location_refer || faker.location.streetAddress(),
    lat: orderObject?.lat || faker.location.latitude(),
    lng: orderObject?.lng || faker.location.longitude(),
  });
  const createdOrderWithCustomerData = await customerOrder
    .listAll()
    .then((orders) => orders.find((order) => order.id === createdOrder.id));
  return createdOrderWithCustomerData;
}

const orchestrator = {
  createCustomerOrder,
};
export default orchestrator;
