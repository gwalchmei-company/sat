import orchestrator from "tests/orchestrator/index.js";
import authorization from "models/authorization";
import user from "models/user";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/devices/[id]/rentals", () => {
  describe("Anonymous user", () => {
    test("Retrieving rentals of a device", async () => {
      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:rentals".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("With valid session", async () => {
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerSession = await orchestrator.createSession(customer);
      await user.setFeatures(customer.id, authorization.featuresRoles.customer);

      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${customerSession.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação.",
        action:
          'Verifique a feature "read:rentals:others" para listar os aluguéis de dispositivos.',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("Retrieving rentals of a device with rentals", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      // Create device and rental
      const device = await orchestrator.createDevice();
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual([
        {
          id: rental.id,
          device_id: rental.device_id,
          customer_id: rental.customer_id,
          customer_order_id: rental.customer_order_id,
          start_date: rental.start_date.toISOString(),
          end_date: rental.end_date.toISOString(),
          status: rental.status,
          notes: rental.notes,
          location_refer: rental.location_refer,
          lat: rental.lat,
          lng: rental.lng,
          created_at: rental.created_at.toISOString(),
          updated_at: rental.updated_at.toISOString(),
          deleted_at: null,
          serial_number: device.serial_number,
          device_model: device.model,
          username: customer.username,
          email: customer.email,
          cpf: customer.cpf,
          phone: customer.phone,
        },
      ]);
    });

    test("Retrieving rentals of a device with no rentals", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      const device = await orchestrator.createDevice();

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual([]);
    });

    test("With invalid device id", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/invalid-id/rentals`,
        {
          headers: {
            Cookie: `session_id=${adminSession.token}`,
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

    test("With non-existent device id", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/123e4567-e89b-12d3-a456-426614174000/rentals`,
        {
          headers: {
            Cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
        status_code: 404,
      });
    });

    test("Retrieving rentals of device with multiple rentals", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      // Create device and multiple rentals
      const device = await orchestrator.createDevice();
      const customer1 = await orchestrator.createUser();
      await orchestrator.activateUser(customer1);
      const customer2 = await orchestrator.createUser();
      await orchestrator.activateUser(customer2);

      const customerOrder1 = await orchestrator.createCustomerOrder({
        customer_id: customer1.id,
      });
      const customerOrder2 = await orchestrator.createCustomerOrder({
        customer_id: customer2.id,
      });

      const rental1 = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer1.id,
        customer_order_id: customerOrder1.id,
      });

      const rental2 = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer2.id,
        customer_order_id: customerOrder2.id,
        start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        end_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBe(2);
      expect(responseBody[0].id).toBe(rental2.id); // Mais recente primeiro
      expect(responseBody[1].id).toBe(rental1.id);
    });
  });

  describe("Manager user", () => {
    test("Retrieving rentals of a device", async () => {
      const manager = await orchestrator.createUser();
      await orchestrator.activateUser(manager);
      const managerSession = await orchestrator.createSession(manager);
      await user.setFeatures(manager.id, authorization.featuresRoles.manager);

      const device = await orchestrator.createDevice();
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${managerSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBe(1);
      expect(responseBody[0].id).toBe(rental.id);
    });
  });

  describe("Operator user", () => {
    test("Retrieving rentals of a device", async () => {
      const operator = await orchestrator.createUser();
      await orchestrator.activateUser(operator);
      const operatorSession = await orchestrator.createSession(operator);
      await user.setFeatures(operator.id, authorization.featuresRoles.operator);

      const device = await orchestrator.createDevice();
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${operatorSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBe(1);
      expect(responseBody[0].id).toBe(rental.id);
    });
  });

  describe("Support user", () => {
    test("Retrieving rentals of a device", async () => {
      const support = await orchestrator.createUser();
      await orchestrator.activateUser(support);
      const supportSession = await orchestrator.createSession(support);
      await user.setFeatures(support.id, authorization.featuresRoles.support);

      const device = await orchestrator.createDevice();
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${device.id}/rentals`,
        {
          headers: {
            Cookie: `session_id=${supportSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBe(1);
      expect(responseBody[0].id).toBe(rental.id);
    });
  });
});
