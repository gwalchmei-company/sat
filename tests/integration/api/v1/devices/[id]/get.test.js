import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import authorization from "models/authorization";
import session from "models/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/devices/:id", () => {
  describe("Anonymous user", () => {
    test("Retrieving the endpoint", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/devices/anyDevice",
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:devices".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("With valid session", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/devices/anyDevice",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:devices".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("With valid session", async () => {
      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      const deviceCreated = await orchestrator.createDevice();

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.admin,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: deviceCreated.id,
        email_acc: deviceCreated.email_acc,
        utid_device: deviceCreated.utid_device,
        serial_number: deviceCreated.serial_number,
        serial_number_router: deviceCreated.serial_number_router,
        model: deviceCreated.model,
        provider: deviceCreated.provider,
        tracker_code: deviceCreated.tracker_code,
        status: deviceCreated.status,
        notes: deviceCreated.notes,
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: deviceCreated.updated_at.toISOString(),
      });
    });

    test("with session expired", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.admin,
      );

      jest.useRealTimers();

      const response = await fetch(
        "http://localhost:3000/api/v1/devices/anyDevice",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });
  });

  describe("Manager user", () => {
    test("With valid session", async () => {
      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      const deviceCreated = await orchestrator.createDevice();

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.manager,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: deviceCreated.id,
        email_acc: deviceCreated.email_acc,
        utid_device: deviceCreated.utid_device,
        serial_number: deviceCreated.serial_number,
        serial_number_router: deviceCreated.serial_number_router,
        model: deviceCreated.model,
        provider: deviceCreated.provider,
        tracker_code: deviceCreated.tracker_code,
        status: deviceCreated.status,
        notes: deviceCreated.notes,
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: deviceCreated.updated_at.toISOString(),
      });
    });

    test("with session expired", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.manager,
      );

      jest.useRealTimers();

      const response = await fetch(
        "http://localhost:3000/api/v1/devices/anyDevice",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });
  });

  describe("Operator user", () => {
    test("With valid session", async () => {
      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      const deviceCreated = await orchestrator.createDevice();

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.operator,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: deviceCreated.id,
        email_acc: deviceCreated.email_acc,
        utid_device: deviceCreated.utid_device,
        serial_number: deviceCreated.serial_number,
        serial_number_router: deviceCreated.serial_number_router,
        model: deviceCreated.model,
        provider: deviceCreated.provider,
        tracker_code: deviceCreated.tracker_code,
        status: deviceCreated.status,
        notes: deviceCreated.notes,
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: deviceCreated.updated_at.toISOString(),
      });
    });

    test("with session expired", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.operator,
      );

      jest.useRealTimers();

      const response = await fetch(
        "http://localhost:3000/api/v1/devices/anyDevice",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });
  });

  describe("Support user", () => {
    test("With valid session", async () => {
      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      const deviceCreated = await orchestrator.createDevice();

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.support,
      );

      const response = await fetch(
        `http://localhost:3000/api/v1/devices/${deviceCreated.id}`,
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: deviceCreated.id,
        email_acc: deviceCreated.email_acc,
        utid_device: deviceCreated.utid_device,
        serial_number: deviceCreated.serial_number,
        serial_number_router: deviceCreated.serial_number_router,
        model: deviceCreated.model,
        provider: deviceCreated.provider,
        tracker_code: deviceCreated.tracker_code,
        status: deviceCreated.status,
        notes: deviceCreated.notes,
        created_at: deviceCreated.created_at.toISOString(),
        updated_at: deviceCreated.updated_at.toISOString(),
      });
    });

    test("with session expired", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.EXPIRATION_IN_MILLISECONDS),
      });

      const adminUser = await orchestrator.createUser();
      const adminUserActivated = await orchestrator.activateUser(adminUser);
      const sessionObject = await orchestrator.createSession(adminUser.id);

      await user.setFeatures(
        adminUserActivated.id,
        authorization.featuresRoles.support,
      );

      jest.useRealTimers();

      const response = await fetch(
        "http://localhost:3000/api/v1/devices/anyDevice",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Usuário não possui sessão ativa.",
        action: "Verifique se este usuário está logado e tente novamente.",
        status_code: 401,
      });
    });
  });
});
