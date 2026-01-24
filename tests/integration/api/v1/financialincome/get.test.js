import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/financialincome", () => {
  describe("Anonymous user", () => {
    test("deny read when user is anonymous", async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
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
    test("return only customer's own financial income", async () => {
      const { user: customer1, session: session1 } =
        await orchestrator.createAuthenticatedUser("customer");
      const { user: customer2 } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental1 = await orchestrator.createRental({
        customer_id: customer1.id,
      });
      const rental2 = await orchestrator.createRental({
        customer_id: customer2.id,
      });

      const income1 = await orchestrator.createFinancialIncome({
        rental_id: rental1.id,
        amount_in_cents: 10000,
        payment_method: "PIX",
      });

      const income2 = await orchestrator.createFinancialIncome({
        rental_id: rental2.id,
        amount_in_cents: 20000,
        payment_method: "CARD",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session1.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(1);
      expect(responseBody[0].id).toBe(income1.id);
      expect(responseBody[0].rental_id).toBe(rental1.id);

      const foundIncome2 = responseBody.find((inc) => inc.id === income2.id);
      expect(foundIncome2).toBeUndefined();
    });

    test("return empty array when customer has no financial income", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
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
      expect(responseBody.length).toBe(0);
    });
  });

  describe("Manager user", () => {
    test("return all financial income when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const incomesToCreate = [];
      for (let i = 0; i < 3; i++) {
        const income = await orchestrator.createFinancialIncome();
        incomesToCreate.push(income);
      }

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
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
        incomesToCreate.length,
      );

      for (const createdIncome of incomesToCreate) {
        const found = responseBody.find(
          (income) => income.id === createdIncome.id,
        );
        expect(found).toBeDefined();
        expect(found).toMatchObject({
          id: createdIncome.id,
          rental_id: createdIncome.rental_id,
          amount_in_cents: createdIncome.amount_in_cents,
          payment_method: createdIncome.payment_method,
        });

        expect(found.rental_status).toBeDefined();
        expect(found.serial_number).toBeDefined();
        expect(found.username).toBeDefined();
      }
    });

    test("return empty array when no financial income exists", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const response = await fetch(
        "http://localhost:3000/api/v1/financialincome",
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(0);
    });
  });

  describe("Admin user", () => {
    test("return all financial income when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const paymentMethods = ["PIX", "CASH", "CARD", "TRANSFER", "BANK_SLIP"];
      const incomesToCreate = [];

      for (const method of paymentMethods) {
        const income = await orchestrator.createFinancialIncome({
          payment_method: method,
        });
        incomesToCreate.push(income);
      }

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
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
        incomesToCreate.length,
      );

      for (const createdIncome of incomesToCreate) {
        const found = responseBody.find(
          (income) => income.id === createdIncome.id,
        );
        expect(found).toBeDefined();
        expect(found).toMatchObject({
          id: createdIncome.id,
          rental_id: createdIncome.rental_id,
          amount_in_cents: createdIncome.amount_in_cents,
          payment_method: createdIncome.payment_method,
          received_at: createdIncome.received_at.toISOString(),
        });

        expect(found.rental_status).toBeDefined();
        expect(found.start_date).toBeDefined();
        expect(found.end_date).toBeDefined();
        expect(found.serial_number).toBeDefined();
        expect(found.device_model).toBeDefined();
        expect(found.username).toBeDefined();
        expect(found.email).toBeDefined();
        expect(found.cpf).toBeDefined();
      }
    });

    test("verify ordering by received_at DESC", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const income1 = await orchestrator.createFinancialIncome({
        received_at: new Date("2026-01-10").toISOString(),
      });
      const income2 = await orchestrator.createFinancialIncome({
        received_at: new Date("2026-01-20").toISOString(),
      });
      const income3 = await orchestrator.createFinancialIncome({
        received_at: new Date("2026-01-15").toISOString(),
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody[0].id).toBe(income2.id);
      expect(responseBody[1].id).toBe(income3.id);
      expect(responseBody[2].id).toBe(income1.id);
    });

    test("not return soft deleted financial income", async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      await orchestrator.createFinancialIncome({
        deleted_at: new Date("2026-01-20").toISOString(),
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/financialincome`,
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
      expect(responseBody.length).toBe(0);
    });
  });
});
