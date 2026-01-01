import orchestrator from "tests/orchestrator.js";

import { faker } from "@faker-js/faker/.";
import financial_expense from "models/financial-expenses";
import { v4 as generateUuid } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/financialexpenses/:id", () => {
  describe("Anonymous user", () => {
    test("With all expense data valid", async () => {
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: faker.number.int({
          min: 0,
          max: 1000,
        }),
        paid_at: faker.date.past().toISOString(),
        due_date_at: faker.date.future().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      const responseBody = await response.json();
      expect(response.status).toBe(403);
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialexpenses".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("With all valid data", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("customer");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: faker.number.int({
          min: 0,
          max: 1000,
        }),
        paid_at: faker.date.past().toISOString(),
        due_date_at: faker.date.future().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialexpenses".',
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
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: "services",
        paid_at: faker.date.past(),
        due_date_at: faker.date.future(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: expense.id,
        description: newValues.description,
        amount_in_cents: newValues.amount_in_cents,
        category: newValues.category,
        paid_at: newValues.paid_at.toISOString(),
        due_date_at: newValues.due_date_at.toISOString(),
        created_at: expense.created_at.toISOString(),
        updated_at: responseBody.updated_at,
      });

      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual({
        id: expense.id,
        description: newValues.description,
        amount_in_cents: newValues.amount_in_cents,
        category: newValues.category,
        paid_at: newValues.paid_at,
        due_date_at: newValues.due_date_at,
        created_at: expense.created_at,
        updated_at: new Date(responseBody.updated_at),
      });
    });

    test("With invalid UUID", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: "services",
        paid_at: faker.date.past(),
        due_date_at: faker.date.future(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/invalid-uuid`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
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
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: "services",
        paid_at: faker.date.past(),
        due_date_at: faker.date.future(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${generateUuid()}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
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

    test("With empty body should not update anything", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {};

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Nenhum valor foi informado para atualização.",
        action: "Insira ao menos um campo válido para realizar esta operação.",
        status_code: 400,
      });

      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });

    test("With forbidden field", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        id: generateUuid(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: `Não é permitido atualizar o campo "id".`,
        action: `Remova o campo "id" e tente novamente.`,
        status_code: 400,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });

    test("Should not allow created_at update", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        created_at: new Date().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: 'Não é permitido atualizar o campo "created_at".',
        action: 'Remova o campo "created_at" e tente novamente.',
        status_code: 400,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });

    test("Should not allow updated_at update", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        updated_at: new Date().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: 'Não é permitido atualizar o campo "updated_at".',
        action: 'Remova o campo "updated_at" e tente novamente.',
        status_code: 400,
      });
      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });

    test("Should not allow null values", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("admin");

      const expense = await orchestrator.createFinancialExpense();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            description: null,
          }),
        },
      );

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        name: "ValidationError",
        message: "Descrição não foi informada ou inválida.",
        action: "Insira uma descrição válida para realizar esta operação.",
        status_code: 400,
      });
    });
  });

  describe("Manager user", () => {
    test("With all valid data", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("manager");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: faker.number.int({
          min: 0,
          max: 1000,
        }),
        paid_at: faker.date.past().toISOString(),
        due_date_at: faker.date.future().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialexpenses".',
        status_code: 403,
      });

      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });

  describe("Operator user", () => {
    test("With all valid data", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("operator");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: faker.number.int({
          min: 0,
          max: 1000,
        }),
        paid_at: faker.date.past().toISOString(),
        due_date_at: faker.date.future().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialexpenses".',
        status_code: 403,
      });

      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });

  describe("Support user", () => {
    test("With all valid data", async () => {
      const { session: sessionObject } =
        await orchestrator.createAuthenticatedUser("support");
      const expense = await orchestrator.createFinancialExpense();
      const newValues = {
        description: faker.lorem.sentence(),
        amount_in_cents: faker.number.int({ min: 100, max: 100000 }),
        category: faker.number.int({
          min: 0,
          max: 1000,
        }),
        paid_at: faker.date.past().toISOString(),
        due_date_at: faker.date.future().toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialexpenses/${expense.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialexpenses".',
        status_code: 403,
      });

      const expenseAfter = await financial_expense.findOneById(expense.id);
      expect(expenseAfter).toEqual(expense);
    });
  });
});
