import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("GET /api/v1/rentals/[id]/incomes", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/incomes`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique a feature "read:financialincome" ou "read:financialincome:self".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("customer can read their rental incomes", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalOwn = await orchestrator.createRental({
        customer_id: user.id,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: rentalOwn.id,
      });

      const incomeOwn2 = await orchestrator.createFinancialIncome({
        rental_id: rentalOwn.id,
      });

      const rentalOther = await orchestrator.createRental();
      await orchestrator.createFinancialIncome({
        rental_id: rentalOther.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rentalOwn.id}/incomes`,
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
      expect(responseBody.length).toBeGreaterThanOrEqual(2);
      expect(responseBody).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: incomeOwn1.id }),
          expect.objectContaining({ id: incomeOwn2.id }),
        ]),
      );

      expect(responseBody).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rental_id: rentalOther.id }),
        ]),
      );
    });

    test("customer cannot read other customer's rental incomes", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental();
      await orchestrator.createFinancialIncome({ rental_id: otherRental.id });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/incomes`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({
        name: "NotFoundError",
        message: "O aluguel não foi encontrado.",
        action: "Verifique o id informado e tente novamente.",
        status_code: 404,
      });
    });
  });

  describe("Admin user", () => {
    test("admin can read any rental incomes", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const rental = await orchestrator.createRental();
      const income = await orchestrator.createFinancialIncome({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/incomes`,
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
      expect(responseBody).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: income.id })]),
      );
    });
  });

  describe("Manager user", () => {
    test("manager can read any rental incomes", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");

      const rental = await orchestrator.createRental();
      const income = await orchestrator.createFinancialIncome({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/incomes`,
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
      expect(responseBody).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: income.id })]),
      );
    });
  });

  describe("Operator user", () => {
    test("operator can read any rental incomes", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");

      const rental = await orchestrator.createRental();
      const income = await orchestrator.createFinancialIncome({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/incomes`,
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
      expect(responseBody).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: income.id })]),
      );
    });
  });

  describe("Support user", () => {
    test("support can read any rental incomes", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");

      const rental = await orchestrator.createRental();
      const income = await orchestrator.createFinancialIncome({
        rental_id: rental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/incomes`,
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
      expect(responseBody).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: income.id })]),
      );
    });
  });
});
