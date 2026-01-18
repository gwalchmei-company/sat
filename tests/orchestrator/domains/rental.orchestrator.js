import { faker } from "@faker-js/faker/";
import rental from "models/rental";
import deviceOrchestrator from "./device.orchestrator.js";
import authOrchestrator from "../auth.orchestrator.js";

async function createRental(rentalObject) {
  const createdDevice = rentalObject?.device_id
    ? null
    : await deviceOrchestrator.createDevice();
  const createdCustomer = rentalObject?.customer_id
    ? null
    : await authOrchestrator.createAuthenticatedUser("customer");

  const createdRental = await rental.create({
    device_id: rentalObject?.device_id || createdDevice.id,
    customer_id: rentalObject?.customer_id || createdCustomer.user.id,
    customer_order_id: rentalObject?.customer_order_id || null,
    start_date: rentalObject?.start_date || new Date().toISOString(),
    end_date:
      rentalObject?.end_date ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: rentalObject?.status || "pending",
    notes: rentalObject?.notes || faker.lorem.sentence(),
    location_refer:
      rentalObject?.location_refer || faker.location.streetAddress(),
    lat: rentalObject?.lat || faker.location.latitude(),
    lng: rentalObject?.lng || faker.location.longitude(),
  });

  return createdRental;
}

const orchestrator = {
  createRental,
};
export default orchestrator;
