import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

let expenseCreated = {};

describe("GET /api/v1/financialexpenses/:id", () => {
  describe("anonymous user", () => {
    test("should return 403 Forbidden", async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/some-id`,
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("customer user", () => {
    test("should return 403 Forbidden", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      expenseCreated = await orchestrator.createFinancialExpense();
      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expenseCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("admin user", () => {
    test("should return 200 OK with financial expenses list", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      expenseCreated = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expenseCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          id: expenseCreated.id,
          description: expenseCreated.description,
          amount_in_cents: expenseCreated.amount_in_cents,
          paid_at: expenseCreated.paid_at,
          due_date_at: expenseCreated.due_date_at,
        }),
      );
    });

    test("With non-existing ID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses/non-existing-id",
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado ou é inválido.",
        action: "Verifique o id e tente novamente.",
        status_code: 400,
      });
    });
  });

  describe("manager user", () => {
    test("should return 200 OK with financial expenses list", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      expenseCreated = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expenseCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(
        expect.objectContaining({
          id: expenseCreated.id,
          description: expenseCreated.description,
          amount_in_cents: expenseCreated.amount_in_cents,
          paid_at: expenseCreated.paid_at,
          due_date_at: expenseCreated.due_date_at,
        }),
      );
    });
  });

  describe("operator user", () => {
    test("should return 403 Forbidden", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expenseCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("support user", () => {
    test("should return 403 Forbidden", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expenseCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "read:financialexpenses".',
        status_code: 403,
      });
    });
  });
});
