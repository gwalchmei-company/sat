import { faker } from "@faker-js/faker/";
import rentalOrchestrator from "./rental.orchestrator.js";
import contract from "models/contract.js";
import authOrchestrator from "../auth.orchestrator.js";

async function createContract(contractObject) {
  const createdRental = contractObject?.rental_id
    ? null
    : await rentalOrchestrator.createRental();

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

async function deleteContract(contractId, deletedByUserId) {
  const deletedBy =
    deletedByUserId ||
    (await authOrchestrator.createAuthenticatedUser("admin")).user.id;

  const deletedContract = await contract.delete(contractId, deletedBy);

  return deletedContract;
}

const orchestrator = {
  createContract,
  deleteContract,
};
export default orchestrator;
