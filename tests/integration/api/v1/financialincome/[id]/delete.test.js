import orchestrator from "tests/orchestrator/index.js";
import financialIncomeOrchestrator from "tests/orchestrator/domains/financial-income.orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/financialincome/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        action:
          'Verifique se seu usuário possui a feature "delete:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny access when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        action:
          'Verifique se seu usuário possui a feature "delete:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("delete financial income successfully (soft delete)", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody).toEqual({});

      const getResponse = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(getResponse.status).toBe(400);
      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });

    test("verify soft deleted financial income does not appear in list", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      // Deletar
      await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const listResponse = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(listResponse.status).toBe(200);
      const listBody = await listResponse.json();
      const found = listBody.find((item) => item.id === financialIncome.id);
      expect(found).toBeUndefined();
    });

    test("fail when financial income id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome/invalid-id",
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
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado ou é inválido.",
        action: "Verifique o id e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when financial income does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome/550e8400-e29b-41d4-a716-446655440000",
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
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });

    test("fail when trying to delete already deleted financial income", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });

    test("cannot update deleted financial income", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 30000,
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });
  });

  describe("Manager user", () => {
    test("deny access when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        action:
          'Verifique se seu usuário possui a feature "delete:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        action:
          'Verifique se seu usuário possui a feature "delete:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny access when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        action:
          'Verifique se seu usuário possui a feature "delete:financialincome".',
        status_code: 403,
      });
    });
  });
});
