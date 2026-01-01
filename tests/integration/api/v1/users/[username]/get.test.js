import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";
import authorization from "models/authorization";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users/:username", () => {
  describe("Anonymous user", () => {
    test("reatriving an user", async () => {
      const userCreated = await orchestrator.createUser();

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${userCreated.username}`,
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "read:user".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("Self user data", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: user.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
        notes: user.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");

      await orchestrator.createUser({
        username: "otherUser",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/otherUser",
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para ler este usuário.",
        action: 'Verifique a feature "read:user" ou "read:user:others".',
        status_code: 403,
      });
    });

    test("With exact case match", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: user.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
        notes: user.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("With case mismatch", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("customer");

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: user.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
        notes: user.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });
  });

  describe("Admin user", () => {
    test("reatriving other user", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const otherUser = await orchestrator.createUser();
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: otherUser.username,
        email: otherUser.email,
        password: responseBody.password,
        features: responseBody.features,
        cpf: otherUser.cpf,
        phone: otherUser.phone,
        address: otherUser.address,
        notes: otherUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });
    test("With nonexistent username", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const response = await fetch(
        "http://localhost:3000/api/v1/users/nonexistent",
        {
          headers: {
            Cookie: `session_id=${session.token}`,
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

  describe("Manager user", () => {
    test("Self user data", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("manager");
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: user.email,
        password: responseBody.password,
        features: authorization.featuresRoles.manager,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
        notes: user.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const otherUser = await orchestrator.createUser();
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: otherUser.username,
        email: otherUser.email,
        password: responseBody.password,
        features: responseBody.features,
        cpf: otherUser.cpf,
        phone: otherUser.phone,
        address: otherUser.address,
        notes: otherUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });
  });

  describe("Operator user", () => {
    test("Self user data", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("operator");
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: user.email,
        password: responseBody.password,
        features: authorization.featuresRoles.operator,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
        notes: user.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const otherUser = await orchestrator.createUser();
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: otherUser.username,
        email: otherUser.email,
        password: responseBody.password,
        features: responseBody.features,
        cpf: otherUser.cpf,
        phone: otherUser.phone,
        address: otherUser.address,
        notes: otherUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });
  });

  describe("Support user", () => {
    test("Self user data", async () => {
      const { session, user } =
        await orchestrator.createAuthenticatedUser("support");
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${user.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: user.username,
        email: user.email,
        password: responseBody.password,
        features: authorization.featuresRoles.support,
        cpf: user.cpf,
        phone: user.phone,
        address: user.address,
        notes: user.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const otherUser = await orchestrator.createUser();
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            Cookie: `session_id=${session.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: otherUser.username,
        email: otherUser.email,
        password: responseBody.password,
        features: responseBody.features,
        cpf: otherUser.cpf,
        phone: otherUser.phone,
        address: otherUser.address,
        notes: otherUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });
  });
});
