import orchestrator from "tests/orchestrator.js";
import { faker } from "@faker-js/faker";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/financialexpenses", () => {
  describe("anonymous user", () => {
    test("should return 403 Forbidden", async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
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

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "GET",
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

      const financialExpensesToCreate = [];
      for (let i = 0; i < 3; i++) {
        financialExpensesToCreate.push({
          description: faker.lorem.sentence(),
          amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
          paid_at: faker.date.past().toISOString(),
          due_date_at: faker.date.future().toISOString(),
        });
      }

      for (const expenseData of financialExpensesToCreate) {
        await orchestrator.createFinancialExpense(expenseData, session);
      }

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBeGreaterThanOrEqual(
        financialExpensesToCreate.length,
      );

      for (const createdExpense of financialExpensesToCreate) {
        const found = responseBody.find(
          (expense) =>
            expense.description === createdExpense.description &&
            expense.amount_in_cents === createdExpense.amount_in_cents,
        );
        expect(found).toBeDefined();
        expect(found).toEqual({
          ...found,
          amount_in_cents: found.amount_in_cents,
        });
      }
    });

    test("Without any financial expenses", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialexpenses",
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });

  describe("manager user", () => {
    test("should return 200 OK with financial expenses list", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      // Create some financial expenses to be listed
      const financialExpensesToCreate = [];
      for (let i = 0; i < 3; i++) {
        financialExpensesToCreate.push({
          description: faker.lorem.sentence(),
          amount_in_cents: faker.number.int({ min: 100, max: 10000 }),
          paid_at: faker.date.past().toISOString(),
          due_date_at: faker.date.future().toISOString(),
        });
      }

      for (const expenseData of financialExpensesToCreate) {
        await orchestrator.createFinancialExpense(expenseData, session);
      }

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBeGreaterThanOrEqual(
        financialExpensesToCreate.length,
      );

      // Verify that the created expenses are in the response
      for (const createdExpense of financialExpensesToCreate) {
        const found = responseBody.find(
          (expense) =>
            expense.description === createdExpense.description &&
            expense.amount_in_cents === createdExpense.amount_in_cents,
        );
        expect(found).toBeDefined();
      }
    });
  });

  describe("operator user", () => {
    test("should return 403 Forbidden", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "GET",
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
        `http://localhost:3000/api/v1/financialexpenses`,
        {
          method: "GET",
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
