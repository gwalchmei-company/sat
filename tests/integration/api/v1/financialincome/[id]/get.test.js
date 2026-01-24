import orchestrator from "tests/orchestrator/index.js";
import financialIncomeOrchestrator from "tests/orchestrator/domains/financial-income.orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/financialincome/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome();

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        action:
          'Verifique se seu usuário possui a feature "read:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("return own financial income when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          rental_id: rental.id,
          amount_in_cents: 25000,
          payment_method: "PIX",
          description: "Pagamento primeira parcela",
          installment_number: 1,
          total_installments: 3,
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody).toMatchObject({
        id: financialIncome.id,
        rental_id: rental.id,
        amount_in_cents: 25000,
        payment_method: "PIX",
        description: "Pagamento primeira parcela",
        installment_number: 1,
        total_installments: 3,
        customer_id: user.id,
      });
      // Verificar joins
      expect(responseBody.rental_status).toBeDefined();
      expect(responseBody.serial_number).toBeDefined();
      expect(responseBody.device_model).toBeDefined();
      expect(responseBody.username).toBeDefined();
      expect(responseBody.email).toBeDefined();
      expect(responseBody.cpf).toBeDefined();
    });

    test("deny access when trying to access another customer financial income", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: otherCustomer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: otherCustomer.id,
      });
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          rental_id: rental.id,
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
        {
          method: "GET",
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
        message: "Você não possui permissão para acessar este recurso.",
        action:
          "Você só pode acessar receitas financeiras dos seus próprios aluguéis.",
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("return any financial income when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
      });
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          rental_id: rental.id,
          amount_in_cents: 50000,
          payment_method: "TRANSFER",
          transaction_id: "TXN-123456",
          notes: "Pagamento antecipado com desconto",
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody).toMatchObject({
        id: financialIncome.id,
        rental_id: rental.id,
        amount_in_cents: 50000,
        payment_method: "TRANSFER",
        transaction_id: "TXN-123456",
        notes: "Pagamento antecipado com desconto",
        customer_id: customer.id,
      });
    });

    test("fail when financial income id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome/invalid-id",
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
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });

    test("not return soft deleted financial income", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          deleted_at: true,
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 400,
      });
    });

    test("return financial income with all payment methods", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const paymentMethods = ["PIX", "CASH", "CARD", "TRANSFER", "BANK_SLIP"];

      for (const method of paymentMethods) {
        const financialIncome =
          await financialIncomeOrchestrator.createFinancialIncome({
            payment_method: method,
          });

        const response = await fetch(
          `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
        expect(responseBody.payment_method).toBe(method);
      }
    });
  });

  describe("Manager user", () => {
    test("return any financial income when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");
      const device = await orchestrator.createDevice();

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
        device_id: device.id,
      });
      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          rental_id: rental.id,
          amount_in_cents: 30000,
          payment_method: "CARD",
          description: "Pagamento integral",
          reference_date: new Date("2026-01-15").toISOString(),
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody).toMatchObject({
        id: financialIncome.id,
        rental_id: rental.id,
        amount_in_cents: 30000,
        payment_method: "CARD",
        description: "Pagamento integral",
        customer_id: customer.id,
      });
      // Verificar dados do rental/device/user
      expect(responseBody.serial_number).toBe(device.serial_number);
      expect(responseBody.username).toBe(customer.username);
    });
  });

  describe("Operator user", () => {
    test("return any financial income when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          amount_in_cents: 35000,
          payment_method: "CASH",
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody.id).toBe(financialIncome.id);
      expect(responseBody.payment_method).toBe("CASH");
    });
  });

  describe("Support user", () => {
    test("return any financial income when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const financialIncome =
        await financialIncomeOrchestrator.createFinancialIncome({
          amount_in_cents: 40000,
          payment_method: "BANK_SLIP",
        });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome/${financialIncome.id}`,
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
      expect(responseBody.id).toBe(financialIncome.id);
      expect(responseBody.payment_method).toBe("BANK_SLIP");
    });
  });
});
