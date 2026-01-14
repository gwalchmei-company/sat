import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/rentals/[id]", () => {
  describe("Anonymous user", () => {
    test("deny access when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "active",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny access when user is customer", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: user.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "active",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("update rental successfully when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
        status: "pending",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "active",
            notes: "Updated notes",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        status: "active",
        notes: "Updated notes",
        customer_id: customer.id,
      });
    });

    describe("Validation", () => {
      test("return 400 when device_id is invalid UUID", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              device_id: "invalid-uuid",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "ValidationError",
          message: "O id do dispositivo não é válido.",
          action: "Verifique o id do dispositivo enviado e tente novamente.",
          status_code: 400,
        });
      });

      test("return 400 when customer_id is invalid UUID", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              customer_id: "invalid-uuid",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "ValidationError",
          message: "O id do cliente não é válido.",
          action: "Verifique o id do cliente enviado e tente novamente.",
          status_code: 400,
        });
      });

      test("return 400 when status is invalid", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              status: "invalid-status",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "ValidationError",
          message: 'O status "invalid-status" não é válido.',
          action:
            "Use um dos status válidos: pending, active, completed, overdue, canceled.",
          status_code: 400,
        });
      });

      test("return 400 when start_date format is invalid", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              start_date: "invalid-date",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "ValidationError",
          message: "A data de início não é válida.",
          action: "Informe uma data de início válida e tente novamente.",
          status_code: 400,
        });
      });

      test("return 400 when end_date format is invalid", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              end_date: "invalid-date",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "ValidationError",
          message: "A data de término não é válida.",
          action: "Informe uma data de término válida e tente novamente.",
          status_code: 400,
        });
      });

      test("return 400 when end_date is before start_date", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              start_date: "2026-01-10T10:00:00Z",
              end_date: "2026-01-05T10:00:00Z",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "ValidationError",
          message: "A data de término deve ser posterior à data de início.",
          action: "Verifique as datas e tente novamente.",
          status_code: 400,
        });
      });

      test("return 404 when device_id does not exist", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();
        const nonExistentDeviceId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              device_id: nonExistentDeviceId,
            }),
          },
        );

        expect(response.status).toBe(404);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "NotFoundError",
          message: "O dispositivo solicitado não foi encontrado no sistema.",
          action:
            "Verifique se o ID do dispositivo está correto e tente novamente.",
          status_code: 404,
        });
      });

      test("return 404 when customer_id does not exist", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const rental = await orchestrator.createRental();
        const nonExistentCustomerId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              customer_id: nonExistentCustomerId,
            }),
          },
        );

        expect(response.status).toBe(404);
        const responseBody = await response.json();
        expect(responseBody).toEqual({
          name: "NotFoundError",
          message: "O usuário informado não foi encontrado no sistema.",
          action:
            "Verifique se o ID do usuário está correto e tente novamente.",
          status_code: 404,
        });
      });

      test("return 404 when rental does not exist", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const nonExistentId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${nonExistentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              status: "active",
            }),
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

      test("return 400 when rental id is invalid UUID", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/invalid-uuid`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              status: "active",
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

      test("return 400 when device has conflicting rental period", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const device = await orchestrator.createDevice();

        await orchestrator.createRental({
          device_id: device.id,
          start_date: "2026-01-10T10:00:00Z",
          end_date: "2026-01-15T10:00:00Z",
          status: "pending",
        });

        const rental2 = await orchestrator.createRental({
          start_date: "2026-01-20T10:00:00Z",
          end_date: "2026-01-25T10:00:00Z",
          status: "pending",
        });

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental2.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              device_id: device.id,
              start_date: "2026-01-12T10:00:00Z",
            }),
          },
        );

        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toMatchObject({
          name: "ValidationError",
          message:
            "Este dispositivo já possui um aluguel ativo para o período solicitado.",
          status_code: 400,
        });
      });

      test("allow update when period does not conflict", async () => {
        const { session } = await orchestrator.createAuthenticatedUser("admin");
        const device = await orchestrator.createDevice();

        await orchestrator.createRental({
          device_id: device.id,
          start_date: "2026-01-10T10:00:00Z",
          end_date: "2026-01-15T10:00:00Z",
          status: "active",
        });

        const rental2 = await orchestrator.createRental({
          start_date: "2026-01-20T10:00:00Z",
          end_date: "2026-01-25T10:00:00Z",
          status: "pending",
        });

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental2.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({
              device_id: device.id,
              start_date: "2026-01-16T10:00:00Z",
            }),
          },
        );

        expect(response.status).toBe(200);
      });
    });

    test("allow updating status from pending to completed", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const { user: customer } =
        await orchestrator.createAuthenticatedUser("customer");

      const rental = await orchestrator.createRental({
        customer_id: customer.id,
        status: "pending",
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "completed",
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: rental.id,
        status: "completed",
      });
    });
  });

  describe("Operator user", () => {
    test("deny access when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "active",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny access when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({
            status: "active",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "update:rentals".',
        status_code: 403,
      });
    });
  });
});
