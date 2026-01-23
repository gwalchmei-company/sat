import { faker } from "@faker-js/faker/";
import rental from "models/rental";
import rentalFiles from "models/rental-file.js";
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

async function createRentalFile(fileObject) {
  const createdRental = fileObject?.rental_id ? null : await createRental();
  const createdUploader = fileObject?.uploaded_by
    ? null
    : await authOrchestrator.createAuthenticatedUser("admin");

  const createdFile = await rentalFiles.create({
    rental_id: fileObject?.rental_id || createdRental.id,
    type: fileObject?.type || "OTHER",
    file_url: fileObject?.file_url || faker.internet.url(),
    file_name: fileObject?.file_name || faker.system.fileName(),
    file_size:
      fileObject?.file_size || faker.number.int({ min: 1000, max: 5000000 }),
    mime_type: fileObject?.mime_type || "application/pdf",
    description: fileObject?.description || faker.lorem.sentence(),
    uploaded_by: fileObject?.uploaded_by || createdUploader.user.id,
  });

  return createdFile;
}

const orchestrator = {
  createRental,
  createRentalFile,
};
export default orchestrator;
