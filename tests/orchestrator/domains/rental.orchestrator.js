import { faker } from "@faker-js/faker/";
import rental from "models/rental";
import rentalFiles from "models/rental-file.js";
import contract from "models/contract.js";
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

async function createContract(contractObject) {
  const createdRental = contractObject?.rental_id ? null : await createRental();

  const contractNumber =
    contractObject?.contract_number ||
    `CT-${faker.number.int({ min: 100000, max: 999999 })}`;

  const createdContract = await contract.create({
    rental_id: contractObject?.rental_id || createdRental.id,
    contract_number: contractNumber,
    status: contractObject?.status || "draft",
    version: contractObject?.version || 1,
    pdf_url: contractObject?.pdf_url || null,
    file_hash: contractObject?.file_hash || null,
    expires_at: contractObject?.expires_at || null,
    previous_contract_id: contractObject?.previous_contract_id || null,
    signed_at: contractObject?.signed_at || null,
    signed_by: contractObject?.signed_by || null,
    deleted_by: contractObject?.deleted_by || null,
  });

  return createdContract;
}

const orchestrator = {
  createRental,
  createRentalFile,
  createContract,
};
export default orchestrator;
