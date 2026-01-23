import orchestrator from "tests/orchestrator/index.js";
import { faker } from "@faker-js/faker";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/contracts", () => {
  describe("Anonymous user", () => {
    test("deny create when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny create when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Operator user", () => {
    test("deny create when user is operator", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Support user", () => {
    test("deny create when user is support", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action: 'Verifique se seu usuário possui a feature "create:contracts".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("create contract successfully with all fields", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        status: "draft",
        version: 1,
        pdf_url: faker.internet.url(),
        file_hash:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        expires_at: expiresAt.toISOString(),
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: expect.any(String),
        rental_id: rental.id,
        contract_number: contractInput.contract_number,
        status: "draft",
        version: 1,
        pdf_url: contractInput.pdf_url,
        file_hash: contractInput.file_hash,
        expires_at: expiresAt.toISOString(),
        previous_contract_id: null,
        signed_at: null,
        signed_by: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
        deleted_at: null,
        deleted_by: null,
      });
    });

    test("create contract with minimal required fields", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: expect.any(String),
        rental_id: rental.id,
        contract_number: contractInput.contract_number,
        status: "draft",
        version: 1,
        pdf_url: null,
        file_hash: null,
        expires_at: null,
        previous_contract_id: null,
        signed_at: null,
        signed_by: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted_at: null,
        deleted_by: null,
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
      });
    });

    test("create contract with generated status", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        status: "generated",
        pdf_url: faker.internet.url(),
        file_hash:
          "a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: expect.any(String),
        rental_id: rental.id,
        contract_number: contractInput.contract_number,
        status: "generated",
        version: 1,
        pdf_url: contractInput.pdf_url,
        file_hash: contractInput.file_hash,
        expires_at: null,
        previous_contract_id: null,
        signed_at: null,
        signed_by: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        deleted_at: null,
        deleted_by: null,
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
      });
    });

    test("fail when rental_id is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const contractInput = {
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do aluguel não foi informado.",
        action: "Informe o id do aluguel e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when rental_id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const contractInput = {
        rental_id: "invalid-uuid",
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when rental_id does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");

      const contractInput = {
        rental_id: "550e8400-e29b-41d4-a716-446655440000",
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(404);
      const responseBody = await response.json();

      expect(responseBody.name).toBe("NotFoundError");
    });

    test("fail when contract_number is missing", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O número do contrato não foi informado.",
        action: "Informe o número do contrato e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when contract_number is not a string", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: 123456,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O número do contrato deve ser uma string.",
        action: "Informe um número válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when contract_number is too long", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: "A".repeat(101),
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O número do contrato não pode ter mais de 100 caracteres.",
        action: "Informe um número válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when status is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        status: "invalid_status",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: 'O status "invalid_status" não é válido.',
        action:
          "Informe um dos status válidos: draft, generated, sent, signed, canceled.",
        status_code: 400,
      });
    });

    test("fail when version is not a number", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        version: "one",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A versão do contrato deve ser um número.",
        action: "Informe uma versão válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when version is less than 1", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        version: 0,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A versão do contrato deve ser maior ou igual a 1.",
        action: "Informe uma versão válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when pdf_url is not a string", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        pdf_url: 123,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A URL do PDF deve ser uma string.",
        action: "Informe uma URL válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when file_hash is not a string", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        file_hash: 123,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O hash do arquivo deve ser uma string.",
        action: "Informe um hash válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when file_hash length is not 64", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        file_hash: "short_hash",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O hash do arquivo deve ter 64 caracteres (SHA256).",
        action: "Informe um hash válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when expires_at is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        expires_at: "invalid-date",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de expiração não é válida.",
        action: "Informe uma data válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when previous_contract_id is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        previous_contract_id: "invalid-uuid",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do contrato anterior não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when signed_at is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        signed_at: "invalid-date",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "A data de assinatura não é válida.",
        action: "Informe uma data válida e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when signed_by is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        signed_by: "invalid-uuid",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do usuário que assinou não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });

    test("fail when deleted_by is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
        deleted_by: "invalid-uuid",
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "O id do usuário que deletou não é válido.",
        action: "Informe um id válido e tente novamente.",
        status_code: 400,
      });
    });
  });

  describe("Manager user", () => {
    test("create contract successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();

      const contractInput = {
        rental_id: rental.id,
        contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      };

      const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify(contractInput),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: expect.any(String),
        rental_id: rental.id,
        contract_number: contractInput.contract_number,
        status: "draft",
        version: 1,
        pdf_url: null,
        file_hash: null,
        expires_at: null,
        previous_contract_id: null,
        signed_at: null,
        signed_by: null,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        cancel_reason: null,
        canceled_at: null,
        canceled_by: null,
        deleted_at: null,
        deleted_by: null,
      });
    });

    test("create contract with all statuses", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();

      const statuses = ["draft", "generated", "sent", "signed", "canceled"];

      for (const status of statuses) {
        const contractInput = {
          rental_id: rental.id,
          contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
          status: status,
        };

        const response = await fetch(`http://localhost:3000/api/v1/contracts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(contractInput),
        });

        expect(response.status).toBe(201);
        const responseBody = await response.json();
        expect(responseBody.status).toBe(status);
      }
    });
  });
});
