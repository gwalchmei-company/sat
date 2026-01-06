import orchestrator from "tests/orchestrator.js";
import authorization from "models/authorization";
import user from "models/user";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/[username]/rentals", () => {
  describe("Anonymous user", () => {
    test("Retrieving rentals of a customer", async () => {
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
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
    test("Retrieving own rentals", async () => {
      // Create customer with rentals
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerSession = await orchestrator.createSession(customer.id);
      await user.setFeatures(customer.id, authorization.featuresRoles.customer);

      // Create a device and rental for this customer
      const device = await orchestrator.createDevice();
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
        {
          headers: {
            Cookie: `session_id=${customerSession.token}`,
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

    test("Trying to retrieve rentals from another customer", async () => {
      // Create two customers
      const customer1 = await orchestrator.createUser();
      await orchestrator.activateUser(customer1);
      const customer1Session = await orchestrator.createSession(customer1.id);
      await user.setFeatures(
        customer1.id,
        authorization.featuresRoles.customer,
      );

      const customer2 = await orchestrator.createUser();
      await orchestrator.activateUser(customer2);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer2.username}/rentals`,
        {
          headers: {
            Cookie: `session_id=${customer1Session.token}`,
          },
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "Você não possui permissão para visualizar esses aluguéis.",
        action: "Entre em contato com o suporte caso precise de ajuda.",
        status_code: 400,
      });
    });

    test("With non-existent username", async () => {
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);
      const customerSession = await orchestrator.createSession(customer.id);
      await user.setFeatures(customer.id, authorization.featuresRoles.customer);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/nonexistentuser/rentals`,
        {
          headers: {
            Cookie: `session_id=${customerSession.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
        status_code: 404,
      });
    });
  });

  describe("Admin user", () => {
    test("Retrieving rentals of any customer", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin.id);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      // Create a customer with rental
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);

      const device = await orchestrator.createDevice();
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
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

    test("Retrieving rentals of customer with no rentals", async () => {
      const admin = await orchestrator.createUser();
      await orchestrator.activateUser(admin);
      const adminSession = await orchestrator.createSession(admin.id);
      await user.setFeatures(admin.id, authorization.featuresRoles.admin);

      // Create a customer without rentals
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
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
  });

  describe("Manager user", () => {
    test("Retrieving rentals of any customer", async () => {
      const manager = await orchestrator.createUser();
      await orchestrator.activateUser(manager);
      const managerSession = await orchestrator.createSession(manager.id);
      await user.setFeatures(manager.id, authorization.featuresRoles.manager);

      // Create a customer with rental
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);

      const device = await orchestrator.createDevice();
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
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
      expect(responseBody[0].customer_id).toBe(customer.id);
    });
  });

  describe("Operator user", () => {
    test("Retrieving rentals of any customer", async () => {
      const operator = await orchestrator.createUser();
      await orchestrator.activateUser(operator);
      const operatorSession = await orchestrator.createSession(operator.id);
      await user.setFeatures(operator.id, authorization.featuresRoles.operator);

      // Create a customer with rental
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);

      const device = await orchestrator.createDevice();
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
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
    test("Retrieving rentals of any customer", async () => {
      const support = await orchestrator.createUser();
      await orchestrator.activateUser(support);
      const supportSession = await orchestrator.createSession(support.id);
      await user.setFeatures(support.id, authorization.featuresRoles.support);

      // Create a customer with rental
      const customer = await orchestrator.createUser();
      await orchestrator.activateUser(customer);

      const device = await orchestrator.createDevice();
      const customerOrder = await orchestrator.createCustomerOrder({
        customer_id: customer.id,
      });
      const rental = await orchestrator.createRental({
        device_id: device.id,
        customer_id: customer.id,
        customer_order_id: customerOrder.id,
      });

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${customer.username}/rentals`,
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
