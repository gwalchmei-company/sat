import orchestrator from "tests/orchestrator.js";
import { faker } from "@faker-js/faker";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/rentals", () => {
  describe("Anonymous user", () => {
    test("deny create when user is anonymous", async () => {
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalInput = {
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rentalInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny create when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalInput = {
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(rentalInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("create rental when user is admin", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalInput = {
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(rentalInput),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: rentalInput.start_date,
        end_date: rentalInput.end_date,
        status: "pending",
        notes: rentalInput.notes,
        location_refer: rentalInput.location_refer,
        lat: rentalInput.lat,
        lng: rentalInput.lng,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });

    test("fail when device_id is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          customer_id: customerUser.user.id,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do dispositivo não foi encontrado ou é inválido.",
        action: "Verifique o id do dispositivo enviado e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when customer_id is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do cliente não foi encontrado ou é inválido.",
        action: "Verifique o id do cliente enviado e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when start_date is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de início não foi informada.",
        action: "Informe a data de início e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when end_date is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          start_date: new Date().toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de término não foi informada.",
        action: "Informe a data de término e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when end_date is before start_date", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de término deve ser posterior à data de início.",
        action: "Verifique as datas e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when device does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: "00000000-0000-0000-0000-000000000000",
          customer_id: customerUser.user.id,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 404,
      });
    });

    test("fail when customer does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: "00000000-0000-0000-0000-000000000000",
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 404,
      });
    });

    test("fail when device_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: "invalid-uuid",
          customer_id: customerUser.user.id,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do dispositivo não foi encontrado ou é inválido.",
        action: "Verifique o id do dispositivo enviado e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when customer_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: "invalid-uuid",
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do cliente não foi encontrado ou é inválido.",
        action: "Verifique o id do cliente enviado e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when start_date is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          start_date: "invalid-date",
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de início não é válida.",
        action: "Informe uma data de início válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when end_date is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          start_date: new Date().toISOString(),
          end_date: "invalid-date",
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de término não é válida.",
        action: "Informe uma data de término válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when status is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "invalid_status",
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: 'O status "invalid_status" não é válido.',
        action:
          "Use um dos status válidos: pending, active, completed, overdue, canceled.",
        status_code: 400,
      });
    });

    test("fail when customer_order_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          customer_order_id: "invalid-uuid",
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do pedido de cliente é inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when customer_order_id does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch("http://localhost:3000/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          device_id: device.id,
          customer_id: customerUser.user.id,
          customer_order_id: "00000000-0000-0000-0000-000000000000",
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      });

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Pedido de cliente não encontrado ou inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
        status_code: 404,
      });
    });
  });

  describe("Manager user", () => {
    test("create rental when user is manager", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalInput = {
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(rentalInput),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        id: expect.any(String),
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: rentalInput.start_date,
        end_date: rentalInput.end_date,
        status: "pending",
        notes: rentalInput.notes,
        location_refer: rentalInput.location_refer,
        lat: rentalInput.lat,
        lng: rentalInput.lng,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
    });
  });

  describe("Operator user", () => {
    test("deny create when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalInput = {
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(rentalInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny create when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const device = await orchestrator.createDevice();
      const customerUser =
        await orchestrator.createAuthenticatedUser("customer");

      const rentalInput = {
        device_id: device.id,
        customer_id: customerUser.user.id,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: faker.lorem.sentence(),
        location_refer: faker.location.streetAddress(),
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(rentalInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:rentals".',
        status_code: 403,
      });
    });
  });
});
