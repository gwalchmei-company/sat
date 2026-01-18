import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/rentalfinancials/:id", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            daily_price_in_cents: 20000,
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny access when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 20000,
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("update all fields successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        deposit_in_cents: 20000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      });

      const newValues = {
        daily_price_in_cents: 15000,
        total_price_in_cents: 90000,
        deposit_in_cents: 30000,
        discount_in_cents: 10000,
        final_price_in_cents: 80000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
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
        id: rentalFinancial.id,
        rental_id: rental.id,
        daily_price_in_cents: 15000,
        total_price_in_cents: 90000,
        deposit_in_cents: 30000,
        discount_in_cents: 10000,
        final_price_in_cents: 80000,
      });
      expect(new Date(responseBody.updated_at).getTime()).toBeGreaterThan(
        new Date(rentalFinancial.updated_at).getTime(),
      );
    });

    test("update only one field", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            discount_in_cents: 5000,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rentalFinancial.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        discount_in_cents: 5000,
        final_price_in_cents: 65000,
      });
    });

    test("fail when body is empty", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        action: 'Contate o suporte informando o campo "errorId".',
        message: 'Nenhum "input" foi especificado para a ação de filtro.',
        status_code: 400,
      });
    });

    test("fail when trying to update invalid field", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            rental_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        action: 'Remova o campo "rental_id" e tente novamente.',
        message: 'O campo "rental_id" não pode ser atualizado.',
        status_code: 400,
      });
    });

    test("fail when daily_price is not a number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: "invalid",
          }),
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

    test("fail when daily_price is a decimal", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 100.5,
          }),
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
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 0,
          }),
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

    test("fail when deposit is negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            deposit_in_cents: -1000,
          }),
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

    test("fail when id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/invalid-uuid`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 20000,
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

    test("fail when rental financial does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const nonExistentId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${nonExistentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 20000,
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
    test("update rental financial successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
        daily_price_in_cents: 10000,
        total_price_in_cents: 70000,
        final_price_in_cents: 65000,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 12000,
            final_price_in_cents: 70000,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rentalFinancial.id,
        daily_price_in_cents: 12000,
        total_price_in_cents: 70000,
        final_price_in_cents: 70000,
      });
    });
  });

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 20000,
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:rentalfinancials".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny access when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();
      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentalfinancials/${rentalFinancial.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            daily_price_in_cents: 20000,
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "update:rentalfinancials".',
        status_code: 403,
      });
    });
  });
});
