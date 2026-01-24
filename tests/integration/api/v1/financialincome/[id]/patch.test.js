import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/financialincome/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const financialIncome = await orchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount_in_cents: 30000,
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny access when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const financialIncome = await orchestrator.createFinancialIncome();

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

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Manager user", () => {
    test("update all fields successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const financialIncome = await orchestrator.createFinancialIncome({
        amount_in_cents: 20000,
        payment_method: "PIX",
        received_at: new Date("2026-01-10").toISOString(),
        description: "Pagamento inicial",
        installment_number: 1,
        total_installments: 3,
        transaction_id: "TXN-111",
        notes: "Primeira parcela",
      });

      const newValues = {
        amount_in_cents: 25000,
        payment_method: "CARD",
        received_at: new Date("2026-01-15").toISOString(),
        reference_date: new Date("2026-01-12").toISOString(),
        description: "Pagamento corrigido",
        installment_number: 2,
        total_installments: 4,
        transaction_id: "TXN-222",
        notes: "Valor corrigido",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(newValues),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: financialIncome.id,
        rental_id: financialIncome.rental_id,
        amount_in_cents: 25000,
        payment_method: "CARD",
        received_at: new Date("2026-01-15").toISOString(),
        reference_date: new Date("2026-01-12").toISOString(),
        description: "Pagamento corrigido",
        installment_number: 2,
        total_installments: 4,
        transaction_id: "TXN-222",
        notes: "Valor corrigido",
      });
      expect(responseBody.updated_at).not.toBe(financialIncome.updated_at);
    });

    test("update only amount_in_cents", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const financialIncome = await orchestrator.createFinancialIncome({
        amount_in_cents: 15000,
        payment_method: "CASH",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 18000,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.amount_in_cents).toBe(18000);
      expect(responseBody.payment_method).toBe("CASH");
    });

    test("update only payment_method", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const financialIncome = await orchestrator.createFinancialIncome({
        payment_method: "PIX",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            payment_method: "TRANSFER",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.payment_method).toBe("TRANSFER");
    });

    test("update notes", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const financialIncome = await orchestrator.createFinancialIncome({
        notes: "Nota original",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            notes: "Nota atualizada com correção",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.notes).toBe("Nota atualizada com correção");
    });
  });

  describe("Admin user", () => {
    test("update successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome = await orchestrator.createFinancialIncome({
        amount_in_cents: 50000,
        payment_method: "BANK_SLIP",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 55000,
            description: "Valor ajustado por desconto",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.amount_in_cents).toBe(55000);
      expect(responseBody.description).toBe("Valor ajustado por desconto");
    });

    test("fail when amount_in_cents is negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome = await orchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: -5000,
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O valor não pode ser negativo.",
        action: "Informe um valor válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail when payment_method is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome = await orchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            payment_method: "BITCOIN",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: 'O método de pagamento "BITCOIN" não é válido.',
        action:
          "Informe um dos métodos válidos: PIX, CASH, CARD, TRANSFER, BANK_SLIP.",
        status_code: 400,
      });
    });

    test("fail when received_at is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome = await orchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            received_at: "invalid-date",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de recebimento é inválida.",
        action: "Insira uma data de recebimento válida.",
        status_code: 400,
      });
    });

    test("fail when reference_date is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome = await orchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            reference_date: "not-a-date",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de referência é inválida.",
        action: "Insira uma data de referência válida.",
        status_code: 400,
      });
    });

    test("fail when installment_number is greater than total_installments", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const financialIncome = await orchestrator.createFinancialIncome({
        installment_number: 2,
        total_installments: 5,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            installment_number: 7,
            total_installments: 5,
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message:
          "O número da parcela não pode ser maior que o total de parcelas.",
        action: "Verifique os valores informados.",
        status_code: 400,
      });
    });

    test("fail when financial income id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome/invalid-id",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 10000,
          }),
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
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 10000,
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

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const financialIncome = await orchestrator.createFinancialIncome();

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

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny access when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const financialIncome = await orchestrator.createFinancialIncome();

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

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:financialincome".',
        status_code: 403,
      });
    });
  });
});
