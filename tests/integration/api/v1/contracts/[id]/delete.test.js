import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/contracts/[id]", () => {
  describe("Anonymous user", () => {
    test("deny delete when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
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
        action: 'Verifique se seu usuário possui a feature "delete:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny delete when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "delete:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("delete contract successfully", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.deleted_at).not.toBeNull();
      expect(responseBody.deleted_by).toBe(user.id);
    });

    test("contract should not appear in list after deletion", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      let listResponse = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      let listBody = await listResponse.json();
      let contractIds = listBody.map((c) => c.id);
      expect(contractIds).toContain(contract.id);

      await fetch(`http://localhost:3000/api/v1/contracts/${contract.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      listResponse = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      listBody = await listResponse.json();
      contractIds = listBody.map((c) => c.id);
      expect(contractIds).not.toContain(contract.id);
    });

    test("cannot get deleted contract by id", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      await fetch(`http://localhost:3000/api/v1/contracts/${contract.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
      });

      const getResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(getResponse.status).toBe(404);
      const getBody = await getResponse.json();
      expect(getBody.message).toBe("O contrato informado não foi encontrado.");
    });

    test("return 404 when contract does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${nonExistentId}`,
        {
          method: "DELETE",
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

    test("return 400 when contract id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const invalidId = "invalid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${invalidId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe("O id do contrato não é válido.");
    });

    test("return 400 when trying to delete already deleted contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const firstDeleteResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(firstDeleteResponse.status).toBe(200);

      const secondDeleteResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(secondDeleteResponse.status).toBe(404);
      const responseBody = await secondDeleteResponse.json();
      expect(responseBody.message).toBe(
        "O contrato informado não foi encontrado.",
      );
    });

    test("delete contract with all expected fields in response", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
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
      expect(responseBody).toHaveProperty("deleted_at");
      expect(responseBody).toHaveProperty("deleted_by");
      expect(responseBody).toHaveProperty("created_at");
      expect(responseBody).toHaveProperty("updated_at");

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.deleted_at).not.toBeNull();
      expect(responseBody.deleted_by).toBe(user.id);
    });
  });

  describe("Manager user", () => {
    test("delete contract successfully", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("manager");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.deleted_at).not.toBeNull();
      expect(responseBody.deleted_by).toBe(user.id);
    });
  });

  describe("Operator user", () => {
    test("deny delete when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Support user", () => {
    test("deny delete when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Contract status validation", () => {
    test("can delete draft contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
    });

    test("can delete signed contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
    });

    test("can delete canceled contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "canceled",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Use case: delete invalid contract", () => {
    test("delete contract that was created by mistake", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();

      const incorrectContract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
        contract_number: "WRONG-CONTRACT",
      });

      const getResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${incorrectContract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(getResponse.status).toBe(200);
      const deleteResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${incorrectContract.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(deleteResponse.status).toBe(200);

      const getAfterDeleteResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${incorrectContract.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(getAfterDeleteResponse.status).toBe(404);
    });
  });
});
