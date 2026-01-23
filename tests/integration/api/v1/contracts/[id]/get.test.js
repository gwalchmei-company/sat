import orchestrator from "tests/orchestrator/index.js";
import { v4 as generateUuid } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/contracts/[id]", () => {
  describe("Anonymous user", () => {
    test("deny read when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

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
    test("read own contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
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
        deleted_at: null,
        deleted_by: null,
        updated_at: contract.updated_at.toISOString(),
        customer_id: user.id,
        device_id: rental.device_id,
        serial_number: responseBody.serial_number,
        device_model: responseBody.device_model,
        customer_username: user.username,
        customer_email: user.email,
        signed_by_username: null,
      });
    });

    test("deny read when trying to access other customer's contract", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${otherContract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
        status_code: 404,
      });
    });

    test("return 404 when contract does not exist", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${nonExistentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
        status_code: 404,
      });
    });

    test("return 400 when contract id is invalid", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const invalidId = "invalid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${invalidId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do contrato não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });
  });

  describe("Admin user", () => {
    test("read any contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
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
        serial_number: responseBody.serial_number,
        device_model: responseBody.device_model,
        customer_username: responseBody.customer_username,
        customer_email: responseBody.customer_email,
        signed_by_username: responseBody.signed_by_username,
      });
    });

    test("return 404 when contract does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const nonExistentId = generateUuid();

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${nonExistentId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(404);
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O contrato informado não foi encontrado.",
        action: "Verifique se o id informado está correto.",
        status_code: 404,
      });
    });

    test("return 400 when contract id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const invalidId = "not-a-valid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${invalidId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do contrato não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });

    test("return contract with all expected fields", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toHaveProperty("id");
      expect(responseBody).toHaveProperty("rental_id");
      expect(responseBody).toHaveProperty("contract_number");
      expect(responseBody).toHaveProperty("status");
      expect(responseBody).toHaveProperty("version");
      expect(responseBody).toHaveProperty("pdf_url");
      expect(responseBody).toHaveProperty("file_hash");
      expect(responseBody).toHaveProperty("expires_at");
      expect(responseBody).toHaveProperty("previous_contract_id");
      expect(responseBody).toHaveProperty("signed_at");
      expect(responseBody).toHaveProperty("signed_by");
      expect(responseBody).toHaveProperty("created_at");
      expect(responseBody).toHaveProperty("deleted_at");
      expect(responseBody).toHaveProperty("deleted_by");
      expect(responseBody).toHaveProperty("customer_id");
      expect(responseBody).toHaveProperty("device_id");
      expect(responseBody).toHaveProperty("serial_number");
      expect(responseBody).toHaveProperty("device_model");
      expect(responseBody).toHaveProperty("customer_username");
      expect(responseBody).toHaveProperty("customer_email");
      expect(responseBody).toHaveProperty("signed_by_username");
    });
  });

  describe("Manager user", () => {
    test("read any contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.rental_id).toBe(rental.id);
      expect(responseBody.contract_number).toBe(contract.contract_number);
    });
  });

  describe("Operator user", () => {
    test("read any contract", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.rental_id).toBe(rental.id);
    });
  });

  describe("Support user", () => {
    test("read any contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.rental_id).toBe(rental.id);
    });
  });

  describe("Contract versions", () => {
    test("read specific version of contract", async () => {
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
        status: "signed",
        version: 2,
        previous_contract_id: contract1.id,
      });

      const responseV1 = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract1.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(responseV1.status).toBe(200);
      const responseBodyV1 = await responseV1.json();
      expect(responseBodyV1.id).toBe(contract1.id);
      expect(responseBodyV1.version).toBe(1);
      expect(responseBodyV1.status).toBe("canceled");
      expect(responseBodyV1.previous_contract_id).toBe(null);

      const responseV2 = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract2.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(responseV2.status).toBe(200);
      const responseBodyV2 = await responseV2.json();
      expect(responseBodyV2.id).toBe(contract2.id);
      expect(responseBodyV2.version).toBe(2);
      expect(responseBodyV2.status).toBe("signed");
      expect(responseBodyV2.previous_contract_id).toBe(contract1.id);
    });
  });

  describe("Deleted contracts", () => {
    test("return 404 for soft deleted contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      await orchestrator.deleteContract(contract.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "O contrato informado não foi encontrado.",
      );
    });
  });
});
