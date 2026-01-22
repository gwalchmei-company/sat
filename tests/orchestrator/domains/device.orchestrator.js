import { faker } from "@faker-js/faker/";
import device from "models/device";

async function createDevice(deviceObject) {
  return await device.create({
    email_acc: deviceObject?.email_acc || faker.internet.email(),
    utid_device: deviceObject?.utid_device || faker.database.mongodbObjectId(),
    serial_number:
      deviceObject?.serial_number || faker.database.mongodbObjectId(),
    serial_number_router:
      deviceObject?.serial_number_router || faker.database.mongodbObjectId(),
    model: deviceObject?.model || "Kit Standart",
    provider: deviceObject?.provider || "Starlink",
    tracker_code: deviceObject?.tracker_code || faker.location.zipCode(),
    status: deviceObject?.status || "available",
    notes: deviceObject?.notes || faker.lorem.text(),
  });
}

const orchestrator = {
  createDevice,
};
export default orchestrator;
