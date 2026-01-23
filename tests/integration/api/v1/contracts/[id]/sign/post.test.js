import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/contracts/[id]/sign", () => {
  describe("Anonymous user", () => {
    test("deny sign when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
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
        action: 'Verifique se seu usuário possui a feature "sign:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("sign own contract successfully", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "sent",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.status).toBe("signed");
      expect(responseBody.signed_at).not.toBeNull();
      expect(responseBody.signed_by).toBe(user.id);
    });

    test("deny sign when trying to sign other customer's contract", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
        status: "sent",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${otherContract.id}/sign`,
        {
          method: "POST",
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

    test("sign contract from status 'draft'", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("signed");
    });

    test("sign contract from status 'generated'", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "generated",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("signed");
    });

    test("return 400 when trying to sign already signed contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_by: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        'Não é possível assinar um contrato com status "signed".',
      );
    });

    test("return 400 when trying to sign canceled contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "canceled",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toContain(
        "Não é possível assinar um contrato com status",
      );
    });

    test("return 404 when contract does not exist", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${nonExistentId}/sign`,
        {
          method: "POST",
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
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const invalidId = "invalid-uuid";

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${invalidId}/sign`,
        {
          method: "POST",
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
  });

  describe("Admin user", () => {
    test("sign any contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "sent",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.status).toBe("signed");
      expect(responseBody.signed_at).not.toBeNull();
      expect(responseBody.signed_by).toBe(user.id);
    });

    test("sign contract with all expected fields", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
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
      expect(responseBody).toHaveProperty("signed_at");
      expect(responseBody).toHaveProperty("signed_by");
      expect(responseBody).toHaveProperty("created_at");
      expect(responseBody).toHaveProperty("updated_at");

      expect(responseBody.status).toBe("signed");
      expect(responseBody.signed_by).toBe(user.id);
      expect(new Date(responseBody.signed_at).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    test("return 400 when trying to sign already signed contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_by: (await orchestrator.createAuthenticatedUser("customer")).user
          .id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        'Não é possível assinar um contrato com status "signed".',
      );
    });
  });

  describe("Manager user", () => {
    test("sign any contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("manager");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "sent",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.status).toBe("signed");
      expect(responseBody.signed_by).toBe(user.id);
    });
  });

  describe("Operator user", () => {
    test("deny sign when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "sent",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
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
    test("deny sign when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "sent",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Status validation", () => {
    test("allowed status transitions to signed", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const statuses = ["draft", "generated", "sent"];

      for (const status of statuses) {
        const rental = await orchestrator.createRental();
        const contract = await orchestrator.createContract({
          rental_id: rental.id,
          status: status,
        });

        const response = await fetch(
          `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
          },
        );

        expect(response.status).toBe(200);
        const responseBody = await response.json();
        expect(responseBody.status).toBe("signed");
      }
    });
  });

  describe("Deleted contracts", () => {
    test("return 404 when trying to sign deleted contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      await orchestrator.deleteContract(contract.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
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

  describe("Use case: complete contract workflow", () => {
    test("customer signs contract after receiving it", async () => {
      const { session: adminSession } =
        await orchestrator.createAuthenticatedUser("admin");
      const { session: customerSession, user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      await fetch(`http://localhost:3000/api/v1/contracts/${contract.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          status: "sent",
        }),
      });

      const signResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${customerSession.token}`,
          },
        },
      );

      expect(signResponse.status).toBe(200);
      const signedContract = await signResponse.json();

      expect(signedContract.status).toBe("signed");
      expect(signedContract.signed_by).toBe(customer.id);
      expect(signedContract.signed_at).not.toBeNull();

      const resignResponse = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${customerSession.token}`,
          },
        },
      );

      expect(resignResponse.status).toBe(400);
    });
  });
});
