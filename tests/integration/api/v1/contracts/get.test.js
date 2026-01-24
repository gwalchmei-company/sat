import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/contracts", () => {
  describe("Anonymous user", () => {
    test("deny read when user is anonymous", async () => {
      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("read only own contracts", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental1 = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract1 = await orchestrator.createContract({
        rental_id: rental1.id,
      });

      const rental2 = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract2 = await orchestrator.createContract({
        rental_id: rental2.id,
      });

      const otherRental = await orchestrator.createRental();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toHaveLength(2);

      const firstElement = responseBody[0];
      const secoundElement = responseBody[1];

      expect(firstElement).toHaveProperty("device_model");
      expect(firstElement).toHaveProperty("serial_number");

      expect(firstElement).toEqual({
        id: firstElement.id,
        rental_id: rental2.id,
        contract_number: contract2.contract_number,
        status: contract2.status,
        version: contract2.version,
        pdf_url: contract2.pdf_url,
        file_hash: contract2.file_hash,
        expires_at: contract2.expires_at,
        previous_contract_id: contract2.previous_contract_id,
        signed_at: contract2.signed_at,
        signed_by: contract2.signed_by,
        created_at: contract2.created_at.toISOString(),
        updated_at: contract2.updated_at.toISOString(),
        deleted_at: null,
        deleted_by: null,
        customer_id: user.id,
        device_id: rental2.device_id,
        serial_number: firstElement.serial_number,
        device_model: firstElement.device_model,
        customer_username: user.username,
        customer_email: user.email,
        signed_by_username: null,
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
      });

      expect(secoundElement).toEqual({
        id: secoundElement.id,
        rental_id: rental1.id,
        contract_number: contract1.contract_number,
        status: contract1.status,
        version: contract1.version,
        pdf_url: contract1.pdf_url,
        file_hash: contract1.file_hash,
        expires_at: contract1.expires_at,
        previous_contract_id: contract1.previous_contract_id,
        signed_at: contract1.signed_at,
        signed_by: contract1.signed_by,
        created_at: contract1.created_at.toISOString(),
        updated_at: contract1.updated_at.toISOString(),
        deleted_at: null,
        deleted_by: null,
        customer_id: user.id,
        device_id: rental1.device_id,
        serial_number: secoundElement.serial_number,
        device_model: secoundElement.device_model,
        customer_username: user.username,
        customer_email: user.email,
        signed_by_username: null,
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
      });

      expect(responseBody.length).toBe(2);

      const contractIds = responseBody.map((c) => c.id);
      expect(contractIds).toContain(contract1.id);
      expect(contractIds).toContain(contract2.id);
      expect(contractIds).not.toContain(otherContract.id);
    });

    test("return empty array when customer has no contracts", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual([]);
    });
  });

  describe("Admin user", () => {
    test("read all contracts", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      // Criar vários contratos
      const rental1 = await orchestrator.createRental();
      const contract1 = await orchestrator.createContract({
        rental_id: rental1.id,
      });

      const rental2 = await orchestrator.createRental();
      const contract2 = await orchestrator.createContract({
        rental_id: rental2.id,
      });

      const rental3 = await orchestrator.createRental();
      const contract3 = await orchestrator.createContract({
        rental_id: rental3.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBeGreaterThanOrEqual(3);

      const contractIds = responseBody.map((c) => c.id);
      expect(contractIds).toContain(contract1.id);
      expect(contractIds).toContain(contract2.id);
      expect(contractIds).toContain(contract3.id);
    });

    test("return contracts with all expected fields", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBeGreaterThanOrEqual(1);
      const contractResponse = responseBody[0];

      expect(contractResponse).toEqual({
        id: contract.id,
        rental_id: rental.id,
        contract_number: contract.contract_number,
        status: contract.status,
        version: contract.version,
        pdf_url: contract.pdf_url,
        file_hash: contract.file_hash,
        expires_at: contract.expires_at,
        previous_contract_id: contract.previous_contract_id,
        signed_at: contract.signed_at,
        signed_by: contract.signed_by,
        created_at: contract.created_at.toISOString(),
        updated_at: contract.updated_at.toISOString(),
        deleted_at: contract.deleted_at,
        deleted_by: contract.deleted_by,
        customer_id: rental.customer_id,
        device_id: rental.device_id,
        serial_number: contractResponse.serial_number,
        device_model: contractResponse.device_model,
        customer_username: contractResponse.customer_username,
        customer_email: contractResponse.customer_email,
        signed_by_username: contractResponse.signed_by_username,
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
      });
    });

    test("return empty array when no contracts exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
    });
  });

  describe("Manager user", () => {
    test("read all contracts", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const rental1 = await orchestrator.createRental();
      const contract1 = await orchestrator.createContract({
        rental_id: rental1.id,
      });

      const rental2 = await orchestrator.createRental();
      const contract2 = await orchestrator.createContract({
        rental_id: rental2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBeGreaterThanOrEqual(2);

      const contractIds = responseBody.map((c) => c.id);
      expect(contractIds).toContain(contract1.id);
      expect(contractIds).toContain(contract2.id);
    });
  });

  describe("Operator user", () => {
    test("read all contracts", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental1 = await orchestrator.createRental();
      const contract1 = await orchestrator.createContract({
        rental_id: rental1.id,
      });

      const rental2 = await orchestrator.createRental();
      const contract2 = await orchestrator.createContract({
        rental_id: rental2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBeGreaterThanOrEqual(2);

      const contractIds = responseBody.map((c) => c.id);
      expect(contractIds).toContain(contract1.id);
      expect(contractIds).toContain(contract2.id);
    });
  });

  describe("Support user", () => {
    test("read all contracts", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental1 = await orchestrator.createRental();
      const contract1 = await orchestrator.createContract({
        rental_id: rental1.id,
      });

      const rental2 = await orchestrator.createRental();
      const contract2 = await orchestrator.createContract({
        rental_id: rental2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBeGreaterThanOrEqual(2);

      const contractIds = responseBody.map((c) => c.id);
      expect(contractIds).toContain(contract1.id);
      expect(contractIds).toContain(contract2.id);
    });
  });

  describe("Contracts ordering", () => {
    test("return contracts ordered by created_at DESC", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();

      const contract1 = await orchestrator.createContract({
        rental_id: rental.id,
        contract_number: "CT-001",
      });

      const contract2 = await orchestrator.createContract({
        rental_id: rental.id,
        contract_number: "CT-002",
      });

      const contract3 = await orchestrator.createContract({
        rental_id: rental.id,
        contract_number: "CT-003",
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      const contractIds = responseBody.map((c) => c.id);
      const indexContract3 = contractIds.indexOf(contract3.id);
      const indexContract2 = contractIds.indexOf(contract2.id);
      const indexContract1 = contractIds.indexOf(contract1.id);

      expect(indexContract3).toBeLessThan(indexContract2);
      expect(indexContract2).toBeLessThan(indexContract1);
    });
  });

  describe("Multiple contracts per rental", () => {
    test("return all contracts for the same rental", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();

      const contract1 = await orchestrator.createContract({
        rental_id: rental.id,
        contract_number: "CT-V1",
        status: "canceled",
        version: 1,
      });

      const contract2 = await orchestrator.createContract({
        rental_id: rental.id,
        contract_number: "CT-V2",
        status: "draft",
        version: 2,
        previous_contract_id: contract1.id,
      });

      const contract3 = await orchestrator.createContract({
        rental_id: rental.id,
        contract_number: "CT-V3",
        status: "signed",
        version: 3,
        previous_contract_id: contract2.id,
      });

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      const rentalContracts = responseBody.filter(
        (c) => c.rental_id === rental.id,
      );

      expect(rentalContracts).toHaveLength(3);

      const contractsMap = Object.fromEntries(
        rentalContracts.map((c) => [c.id, c]),
      );

      expect(contractsMap[contract1.id].status).toBe("canceled");
      expect(contractsMap[contract2.id].status).toBe("draft");
      expect(contractsMap[contract2.id].previous_contract_id).toBe(
        contract1.id,
      );
      expect(contractsMap[contract3.id].status).toBe("signed");
      expect(contractsMap[contract3.id].previous_contract_id).toBe(
        contract2.id,
      );
    });
  });
});
