import orchestrator from "tests/orchestrator.js";
import financial_expense from "models/financial-expenses";
import { v4 as generateUuid } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/financialexpenses/:id", () => {
  describe("Anonymous user", () => {
    test("With all expense data valid", async () => {
      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "delete:financialexpenses".',
        status_code: 403,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });

  describe("Customer user", () => {
    test("With valid id", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("customer");
      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "delete:financialexpenses".',
        status_code: 403,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });

  describe("Admin user", () => {
    test("With all valid data", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");
      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("content-type")).toBeNull();
      const expenseAfter = await financial_expense
        .findOneById(expense.id)
        .catch((e) => e);
      expect(expenseAfter).toBeInstanceOf(Error);
      expect(expenseAfter.name).toBe("NotFoundError");
    });

    test("With invalid UUID", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/invalid-uuid`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado ou é inválido.",
        action: "Verifique o id e tente novamente.",
        status_code: 400,
      });
    });

    test("With valid UUID but non-existent", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${generateUuid()}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O id informado não foi encontrado ou é inválido.",
        action: "Verifique o id e tente novamente.",
        status_code: 404,
      });
    });

    test("Should not delete the same resource twice", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");

      const expense = await orchestrator.createFinancialExpense();

      // First delete
      const firstResponse = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(firstResponse.status).toBe(204);

      // Second delete
      const secondResponse = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(secondResponse.status).toBe(404);
    });
  });

  describe("Manager user", () => {
    test("With valid id", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("manager");
      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "delete:financialexpenses".',
        status_code: 403,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });

  describe("Operator user", () => {
    test("With valid id", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("operator");
      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "delete:financialexpenses".',
        status_code: 403,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });

  describe("Support user", () => {
    test("With valid id", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("support");
      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "DELETE",
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "delete:financialexpenses".',
        status_code: 403,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });
});
