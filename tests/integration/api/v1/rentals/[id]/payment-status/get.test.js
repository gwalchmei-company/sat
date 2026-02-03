import orchestrator from "tests/orchestrator/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("GET /api/v1/rentals/[id]/payment-status", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/payment-status`,
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
    test("customer can read their rental payment-status", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalOwn = await orchestrator.createRental({
        customer_id: user.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: rentalOwn.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: rentalOwn.id,
        amount_in_cents: 1000,
        status: "paid",
      });

      const incomeOwn2 = await orchestrator.createFinancialIncome({
        rental_id: rentalOwn.id,
        amount_in_cents: 2000,
      });

      const otherRental = await orchestrator.createRental();
      await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rentalOwn.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents:
          incomeOwn1.amount_in_cents + incomeOwn2.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 100,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });

    test("customer cannot read other customer's rental payment-status", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental();
      await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const body = await response.json();

      expect(body).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique a feature "read:financialincome" ou "read:financialincome:self".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("is fully paid with single payment", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 3000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: incomeOwn1.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 100,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });

    test("is fully paid with multiple payments", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const income1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 500,
        status: "paid",
      });
      const income2 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 500,
        status: "paid",
      });
      const income3 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 1000,
        status: "paid",
      });
      const income4 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 1000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents:
          income1.amount_in_cents +
          income2.amount_in_cents +
          income3.amount_in_cents +
          income4.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 100,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });

    test("has no payments", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: 0,
        remaining_in_cents: rentalFinancial.final_price_in_cents,
        is_paid: false,
        percentage_paid: 0,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: true,
          is_overpaid: false,
        },
      });
    });

    test("has payments but is not fully paid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 1000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: incomeOwn1.amount_in_cents,
        remaining_in_cents:
          rentalFinancial.final_price_in_cents - incomeOwn1.amount_in_cents,
        is_paid: false,
        percentage_paid: 33,
        resume: {
          is_partially_paid: true,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });

    test("is overpaid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 4000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: incomeOwn1.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 133,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: true,
        },
      });
    });
  });

  describe("Manager user", () => {
    test("is fully paid with single payment", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 3000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: incomeOwn1.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 100,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });
  });

  describe("Operator user", () => {
    test("is fully paid with single payment", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 3000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: incomeOwn1.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 100,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });
  });

  describe("Support user", () => {
    test("is fully paid with single payment", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const { user: customerUser } =
        await orchestrator.createAuthenticatedUser("customer");

      const otherRental = await orchestrator.createRental({
        customer_id: customerUser.id,
      });

      const rentalFinancial = await orchestrator.createRentalFinancial({
        rental_id: otherRental.id,
        daily_price_in_cents: 1000,
        total_price_in_cents: 3000,
        deposit_in_cents: 0,
        discount_in_cents: 0,
        final_price_in_cents: 3000,
      });

      const incomeOwn1 = await orchestrator.createFinancialIncome({
        rental_id: otherRental.id,
        amount_in_cents: 3000,
        status: "paid",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${otherRental.id}/payment-status`,
        {
          method: "GET",
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        final_price_in_cents: rentalFinancial.final_price_in_cents,
        total_received_in_cents: incomeOwn1.amount_in_cents,
        remaining_in_cents: 0,
        is_paid: true,
        percentage_paid: 100,
        resume: {
          is_partially_paid: false,
          noPaymentsReceived: false,
          is_overpaid: false,
        },
      });
    });
  });
});
