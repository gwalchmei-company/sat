import orchestrator from "tests/orchestrator/index.js";
import { faker } from "@faker-js/faker";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("POST /api/v1/financialincome", () => {
  describe("Anonymous user", () => {
    test("deny create when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const financialIncomeInput = {
        rental_id: rental.id,
        amount_in_cents: faker.number.int({ min: 5000, max: 50000 }),
        payment_method: "PIX",
        received_at: faker.date.recent({ days: 10 }).toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(financialIncomeInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny create when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental();

      const financialIncomeInput = {
        rental_id: rental.id,
        amount_in_cents: faker.number.int({ min: 5000, max: 50000 }),
        payment_method: "PIX",
        received_at: faker.date.recent({ days: 10 }).toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(financialIncomeInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("create financial income when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const financialIncomeInput = {
        rental_id: rental.id,
        amount_in_cents: 30000,
        payment_method: "CARD",
        received_at: new Date("2026-01-22T14:30:00Z").toISOString(),
        reference_date: new Date("2026-01-15T00:00:00Z").toISOString(),
        description: "Pagamento integral do aluguel",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(financialIncomeInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        rental_id: financialIncomeInput.rental_id,
        amount_in_cents: financialIncomeInput.amount_in_cents,
        payment_method: financialIncomeInput.payment_method,
        received_at: financialIncomeInput.received_at,
        reference_date: financialIncomeInput.reference_date,
        description: financialIncomeInput.description,
        installment_number: null,
        total_installments: null,
        transaction_id: null,
        notes: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted_at: null,
      });

      // eslint-disable-next-line no-undef
      await new Promise((resolve) => setTimeout(resolve, 100));
      const allEmails = await orchestrator.getAllEmails();

      const emailToCustomer = allEmails.find(
        (email) =>
          email.recipients.includes(`<${customerUser.email}>`) &&
          email.subject == "Pagamento recebido com sucesso!",
      );

      expect(emailToCustomer).toBeDefined();
      expect(emailToCustomer.sender).toBe("<contato@gwalchmei.com.br>");
      expect(emailToCustomer.text === "").toBe(false);

      const emailToAdmin = allEmails.find(
        (email) =>
          email.recipients.includes(`<ryan@gwalchmei.com.br>`) &&
          email.subject == "Pagamento recebido",
      );

      expect(emailToAdmin).toBeDefined();
      expect(emailToAdmin.sender).toBe("<contato@gwalchmei.com.br>");
      expect(emailToAdmin.text === "").toBe(false);
    });

    test("fail when rental_id is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            amount_in_cents: 10000,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do aluguel não foi informado.",
        action: "Informe o id do aluguel e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when rental_id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: "invalid-uuid",
            amount_in_cents: 10000,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when rental does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: "550e8400-e29b-41d4-a716-446655440000",
            amount_in_cents: 10000,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        action: "Verifique o id informado e tente novamente.",
        message: "O aluguel não foi encontrado.",
        status_code: 404,
      });
    });

    test("fail when amount_in_cents is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O valor não foi informado.",
        action: "Informe um valor válido para realizar esta operação.",
        status_code: 400,
      });
    });

    test("fail when amount_in_cents is negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: -5000,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
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

    test("fail when payment_method is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: 10000,
            received_at: new Date().toISOString(),
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O método de pagamento não foi informado.",
        action: "Informe um método de pagamento válido.",
        status_code: 400,
      });
    });

    test("fail when payment_method is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: 10000,
            payment_method: "BITCOIN",
            received_at: new Date().toISOString(),
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

    test("fail when received_at is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: 10000,
            payment_method: "PIX",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de recebimento não foi informada.",
        action: "Informe uma data de recebimento válida.",
        status_code: 400,
      });
    });

    test("fail when received_at is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: 10000,
            payment_method: "PIX",
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

    test("fail when installment_number without total_installments", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: 10000,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
            installment_number: 1,
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message:
          "Ao informar o número da parcela, é necessário informar o total de parcelas.",
        action: "Informe o total de parcelas.",
        status_code: 400,
      });
    });

    test("fail when installment_number is greater than total_installments", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: rental.id,
            amount_in_cents: 10000,
            payment_method: "PIX",
            received_at: new Date().toISOString(),
            installment_number: 5,
            total_installments: 3,
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

    test("create with all payment methods", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const paymentMethods = ["PIX", "CASH", "CARD", "TRANSFER", "BANK_SLIP"];

      for (const method of paymentMethods) {
        const rental = await orchestrator.createRental();

        const response = await fetch(
          "http://localhost:3000/api/v1/financialincome",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              rental_id: rental.id,
              amount_in_cents: 15000,
              payment_method: method,
              received_at: new Date().toISOString(),
            }),
          },
        );

        expect(response.status).toBe(201);
        const responseBody = await response.json();
        expect(responseBody.payment_method).toBe(method);
      }
    });
  });

  describe("Manager user", () => {
    test("create financial income when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();

      const financialIncomeInput = {
        rental_id: rental.id,
        amount_in_cents: 25000,
        payment_method: "PIX",
        received_at: new Date("2026-01-20T10:00:00Z").toISOString(),
        description: "Pagamento primeira parcela",
        installment_number: 1,
        total_installments: 3,
        transaction_id: faker.string.uuid(),
        notes: "Cliente pagou adiantado",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(financialIncomeInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        rental_id: financialIncomeInput.rental_id,
        amount_in_cents: financialIncomeInput.amount_in_cents,
        payment_method: financialIncomeInput.payment_method,
        received_at: financialIncomeInput.received_at,
        description: financialIncomeInput.description,
        installment_number: financialIncomeInput.installment_number,
        total_installments: financialIncomeInput.total_installments,
        transaction_id: financialIncomeInput.transaction_id,
        notes: financialIncomeInput.notes,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted_at: null,
      });
    });
  });

  describe("Operator user", () => {
    test("deny create when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();

      const financialIncomeInput = {
        rental_id: rental.id,
        amount_in_cents: faker.number.int({ min: 5000, max: 50000 }),
        payment_method: "PIX",
        received_at: faker.date.recent({ days: 10 }).toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(financialIncomeInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialincome".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny create when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();

      const financialIncomeInput = {
        rental_id: rental.id,
        amount_in_cents: faker.number.int({ min: 5000, max: 50000 }),
        payment_method: "PIX",
        received_at: faker.date.recent({ days: 10 }).toISOString(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(financialIncomeInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:financialincome".',
        status_code: 403,
      });
    });
  });
});
