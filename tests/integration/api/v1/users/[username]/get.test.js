import { version as uuidVersion } from "uuid";
import orchestrator from "tests/orchestrator.js";
import user from "models/user";
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
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
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
      const userCreated = await orchestrator.createUser({
        username: "customerUserSelf",
      });
      const activatedUser = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/customerUserSelf",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "customerUserSelf",
        email: activatedUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: activatedUser.cpf,
        phone: activatedUser.phone,
        address: activatedUser.address,
        notes: activatedUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.customer,
      );

      await orchestrator.createUser({
        username: "otherUser",
      });

      const response = await fetch(
        "http://localhost:3000/api/v1/users/otherUser",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
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
      const createdUser = await orchestrator.createUser({
        username: "MesmoCase",
      });

      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/MesmoCase",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "MesmoCase",
        email: createdUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: createdUser.cpf,
        phone: createdUser.phone,
        address: createdUser.address,
        notes: createdUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("With case mismatch", async () => {
      const createdUser = await orchestrator.createUser({
        username: "CaseDiferente",
      });
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(
        createdUser.id,
        authorization.featuresRoles.customer,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/casediferente",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "CaseDiferente",
        email: createdUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.customer,
        cpf: createdUser.cpf,
        phone: createdUser.phone,
        address: createdUser.address,
        notes: createdUser.notes,
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
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(userCreated.id, authorization.featuresRoles.admin);

      const otherUser = await orchestrator.createUser();

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
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
      const createdUser = await orchestrator.createUser();
      await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(createdUser.id);
      await user.setFeatures(createdUser.id, authorization.featuresRoles.admin);

      const response = await fetch(
        "http://localhost:3000/api/v1/users/nonexistent",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
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
      const userCreated = await orchestrator.createUser({
        username: "managerUserself",
      });
      const activatedUser = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.manager,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/managerUserself",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "managerUserself",
        email: activatedUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.manager,
        cpf: activatedUser.cpf,
        phone: activatedUser.phone,
        address: activatedUser.address,
        notes: activatedUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.manager,
      );

      const otherUser = await orchestrator.createUser();

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
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
      const userCreated = await orchestrator.createUser({
        username: "operatorUserSelf",
      });
      const activatedUser = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.operator,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/operatorUserSelf",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "operatorUserSelf",
        email: activatedUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.operator,
        cpf: activatedUser.cpf,
        phone: activatedUser.phone,
        address: activatedUser.address,
        notes: activatedUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.operator,
      );

      const otherUser = await orchestrator.createUser();

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
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
      const userCreated = await orchestrator.createUser({
        username: "supportUserSelf",
      });
      const activatedUser = await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.support,
      );

      const response = await fetch(
        "http://localhost:3000/api/v1/users/supportUserSelf",
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        id: responseBody.id,
        username: "supportUserSelf",
        email: activatedUser.email,
        password: responseBody.password,
        features: authorization.featuresRoles.support,
        cpf: activatedUser.cpf,
        phone: activatedUser.phone,
        address: activatedUser.address,
        notes: activatedUser.notes,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_at)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
    });

    test("reatriving other user", async () => {
      const userCreated = await orchestrator.createUser();
      await orchestrator.activateUser(userCreated);
      const sessionObject = await orchestrator.createSession(userCreated.id);
      await user.setFeatures(
        userCreated.id,
        authorization.featuresRoles.support,
      );

      const otherUser = await orchestrator.createUser();

      const response = await fetch(
        `http://localhost:3000/api/v1/users/${otherUser.username}`,
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
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
