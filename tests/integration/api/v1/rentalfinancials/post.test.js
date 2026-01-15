import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/rentalfinancials", () => {
  describe("Anonymous user", () => {
    test("deny create when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny create when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("create rental financial when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toMatchObject({
        id: expect.any(String),
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted_at: null,
      });
    });

    test("fail when rental_id is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rentalFinancialInput = {
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
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

    test("fail when rental_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rentalFinancialInput = {
        rental_id: "invalid-uuid",
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
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
      const nonExistentId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const rentalFinancialInput = {
        rental_id: nonExistentId,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O aluguel não foi encontrado.",
        action: "Verifique o id informado e tente novamente.",
        status_code: 404,
      });
    });

    test("fail when daily_price is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço diário não foi informado.",
        action: "Informe o preço diário e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when daily_price is not a number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: "invalid",
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço diário deve ser um número inteiro maior que zero.",
        action: "Informe um preço diário válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when daily_price is zero or negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 0,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço diário deve ser um número inteiro maior que zero.",
        action: "Informe um preço diário válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when total_price is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço total não foi informado.",
        action: "Informe o preço total e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when total_price is not a number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: "invalid",
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço total deve ser um número inteiro maior que zero.",
        action: "Informe um preço total válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when total_price is zero or negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 0,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço total deve ser um número inteiro maior que zero.",
        action: "Informe um preço total válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when final_price is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço final não foi informado.",
        action: "Informe o preço final e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when final_price is not a number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: "invalid",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço final deve ser um número inteiro maior que zero.",
        action: "Informe um preço final válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when final_price is zero or negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: -1,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço final deve ser um número inteiro maior que zero.",
        action: "Informe um preço final válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when daily_price is a decimal number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 100.5,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O preço diário deve ser um número inteiro maior que zero.",
        action: "Informe um preço diário válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when deposit is a decimal number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 100.5,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O depósito deve ser um número inteiro maior ou igual a zero.",
        action: "Informe um depósito válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when discount is a decimal number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        discount_in_cents: 50.5,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O desconto deve ser um número inteiro maior ou igual a zero.",
        action: "Informe um desconto válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when deposit is negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: -10000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O depósito deve ser um número inteiro maior ou igual a zero.",
        action: "Informe um depósito válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when discount is negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        discount_in_cents: -5000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O desconto deve ser um número inteiro maior ou igual a zero.",
        action: "Informe um desconto válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when rental already has a financial record", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      // First creation should succeed
      const firstResponse = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(firstResponse.status).toBe(201);

      // Second creation should fail
      const secondResponse = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(secondResponse.status).toBe(400);
      const responseBody = await secondResponse.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Já existe um registro financeiro para este aluguel.",
        action: "Cada aluguel pode ter apenas um registro financeiro.",
        status_code: 400,
      });
    });

    test("create rental financial with minimal fields (deposit and discount default to 0)", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 70000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toMatchObject({
        id: expect.any(String),
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 70000,
      });
    });
  });

  describe("Manager user", () => {
    test("create rental financial when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toMatchObject({
        id: expect.any(String),
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      });
    });
  });

  describe("Operator user", () => {
    test("deny create when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny create when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();

      const rentalFinancialInput = {
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(rentalFinancialInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:rentalfinancials".',
        status_code: 403,
      });
    });
  });
});
