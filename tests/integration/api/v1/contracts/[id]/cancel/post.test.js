import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/contracts/[id]/cancel", () => {
  describe("Anonymous user", () => {
    test("deny cancel when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
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
        action: 'Verifique se seu usuário possui a feature "cancel:contracts".',
        message: "Você não possui permissão para executar essa ação",
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("cancel own contract successfully", async () => {
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
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            cancel_reason: "Não preciso mais do equipamento",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.status).toBe("canceled");
      expect(responseBody.canceled_at).not.toBeNull();
      expect(responseBody.canceled_by).toBe(user.id);
      expect(responseBody.cancel_reason).toBe(
        "Não preciso mais do equipamento",
      );
      expect(responseBody.deleted_at).toBeNull();
    });

    test("cancel signed contract successfully", async () => {
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
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
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
      expect(responseBody.status).toBe("canceled");
      expect(responseBody.canceled_at).not.toBeNull();
      expect(responseBody.canceled_by).toBe(user.id);
    });

    test("schedule cancel for signed contract", async () => {
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

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            canceled_at: futureDate.toISOString(),
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(contract.id);
      expect(responseBody.status).toBe("signed"); // Status não muda ainda
      expect(responseBody.canceled_at).not.toBeNull();
      expect(responseBody.canceled_by).toBe(user.id);
    });

    test("deny cancel when trying to cancel other customer's contract", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${otherContract.id}/cancel`,
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

    test("return 400 when trying to cancel already canceled contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "canceled",
        canceled_at: new Date().toISOString(),
        canceled_by: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
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
      expect(responseBody).toEqual({
        name: "ValidationError",
        action:
          "O contrato deve estar em um dos seguintes status: draft, signed.",
        message: 'Não é possível cancelar um contrato com status "canceled".',
        status_code: 400,
      });
    });

    test("return 400 when trying to cancel contract in invalid status", async () => {
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
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
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
        'Não é possível cancelar um contrato com status "generated".',
      );
    });

    test("return 400 when trying to schedule cancel for draft contract", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            canceled_at: futureDate.toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "Só é possível agendar cancelamento para contratos assinados (ativos).",
      );
    });

    test("return 400 when canceled_at is in the past", async () => {
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

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            canceled_at: pastDate.toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "A data de cancelamento deve ser no futuro.",
      );
    });

    test("verify deleted_at is never set when canceling", async () => {
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
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
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

      expect(responseBody.status).toBe("canceled");
      expect(responseBody.canceled_at).not.toBeNull();
      expect(responseBody.deleted_at).toBeNull();
      expect(responseBody.deleted_by).toBeNull();
    });
  });

  describe("Admin user", () => {
    test("cancel any contract successfully", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("admin");

      const otherRental = await orchestrator.createRental();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${otherContract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            cancel_reason: "Cancelado pelo admin",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(otherContract.id);
      expect(responseBody.status).toBe("canceled");
      expect(responseBody.canceled_at).not.toBeNull();
      expect(responseBody.canceled_by).toBe(user.id);
      expect(responseBody.cancel_reason).toBe("Cancelado pelo admin");
    });

    test("schedule cancel for any signed contract", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const otherRental = await orchestrator.createRental();
      const existingUser = await orchestrator.createUser();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_by: existingUser.id,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${otherContract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            canceled_at: futureDate.toISOString(),
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.id).toBe(otherContract.id);
      expect(responseBody.status).toBe("signed");
      expect(responseBody.canceled_at).not.toBeNull();
    });
  });

  describe("Manager user", () => {
    test("cancel any contract successfully", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("manager");

      const otherRental = await orchestrator.createRental();
      const otherContract = await orchestrator.createContract({
        rental_id: otherRental.id,
        status: "signed",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${otherContract.id}/cancel`,
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

      expect(responseBody.id).toBe(otherContract.id);
      expect(responseBody.status).toBe("canceled");
      expect(responseBody.canceled_by).toBe(user.id);
    });
  });

  describe("Operator user", () => {
    test("deny cancel when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "Você não possui permissão para executar essa ação",
      );
    });
  });

  describe("Support user", () => {
    test("deny cancel when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental = await orchestrator.createRental();
      const contract = await orchestrator.createContract({
        rental_id: rental.id,
        status: "draft",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/contracts/${contract.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.message).toBe(
        "Você não possui permissão para executar essa ação",
      );
    });
  });
});
