import orchestrator from "tests/orchestrator/index.js";
import { faker } from "@faker-js/faker";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/rentals/[id]/files", () => {
  describe("Anonymous user", () => {
    test("deny create when user is anonymous", async () => {
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
        file_name: "contract.pdf",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:rentalfiles".',
        status_code: 403,
      });
    });
  });

  describe("Customer user", () => {
    test("deny create when user is customer", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("customer");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
        file_name: "contract.pdf",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar essa ação",
        action:
          'Verifique se seu usuário possui a feature "create:rentalfiles".',
        status_code: 403,
      });
    });
  });

  describe("Admin user", () => {
    test("create rental file successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
        file_name: "contract.pdf",
        file_size: 102400,
        mime_type: "application/pdf",
        description: "Contract for rental",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: expect.any(String),
        rental_id: rental.id,
        type: fileInput.type,
        file_url: fileInput.file_url,
        file_name: fileInput.file_name,
        file_size: fileInput.file_size,
        mime_type: fileInput.mime_type,
        description: fileInput.description,
        uploaded_by: expect.any(String),
        created_at: expect.any(String),
        deleted_at: null,
        deleted_by: null,
      });
    });

    test("create rental file with minimal required fields", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "DELIVERY_PHOTO",
        file_url: faker.internet.url(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: expect.any(String),
        rental_id: rental.id,
        type: fileInput.type,
        file_url: fileInput.file_url,
        file_name: null,
        file_size: null,
        mime_type: null,
        description: null,
        uploaded_by: expect.any(String),
        created_at: expect.any(String),
        deleted_at: null,
        deleted_by: null,
      });
    });

    test("reject when rental_id does not exist", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const fakeRentalId = "00000000-0000-0000-0000-000000000000";

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${fakeRentalId}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("NotFoundError");
      expect(responseBody.message).toBe("O aluguel não foi encontrado.");
    });

    test("reject when rental_id is invalid UUID", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const invalidRentalId = "invalid-uuid";

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${invalidRentalId}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe("O id do aluguel não é válido.");
    });

    test("reject when type is not provided", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        file_url: faker.internet.url(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe("O tipo do arquivo não foi informado.");
    });

    test("reject when type is invalid", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "INVALID_TYPE",
        file_url: faker.internet.url(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe('O tipo "INVALID_TYPE" não é válido.');
    });

    test("reject when file_url is not provided", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "CONTRACT",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe("A URL do arquivo não foi informada.");
    });

    test("reject when file_size is negative", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
        file_size: -1000,
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe(
        "O tamanho do arquivo deve estar entre 0 e 50MB.",
      );
    });

    test("reject when file_size exceeds 50MB", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "CONTRACT",
        file_url: faker.internet.url(),
        file_size: 52428801, // 50MB + 1 byte
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe(
        "O tamanho do arquivo deve estar entre 0 e 50MB.",
      );
    });

    test("create all valid file types", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("admin");
      const rental = await orchestrator.createRental();

      const fileTypes = [
        "DELIVERY_PHOTO",
        "RETURN_PHOTO",
        "CONTRACT",
        "OTHER",
        "DAMAGE_REPORT",
        "PAYMENT_RECEIPT",
      ];

      for (const fileType of fileTypes) {
        const fileInput = {
          type: fileType,
          file_url: faker.internet.url(),
        };

        const response = await fetch(
          `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify(fileInput),
          },
        );

        expect(response.status).toBe(201);
        const responseBody = await response.json();
        expect(responseBody.type).toBe(fileType);
      }
    });
  });

  describe("Manager user", () => {
    test("create rental file successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("manager");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "RETURN_PHOTO",
        file_url: faker.internet.url(),
        file_name: "return_photo.jpg",
        mime_type: "image/jpeg",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.type).toBe("RETURN_PHOTO");
      expect(responseBody.file_name).toBe("return_photo.jpg");
    });
  });

  describe("Operator user", () => {
    test("create rental file successfully", async () => {
      const { session } =
        await orchestrator.createAuthenticatedUser("operator");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "DELIVERY_PHOTO",
        file_url: faker.internet.url(),
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.type).toBe("DELIVERY_PHOTO");
    });
  });

  describe("Support user", () => {
    test("create rental file successfully", async () => {
      const { session } = await orchestrator.createAuthenticatedUser("support");
      const rental = await orchestrator.createRental();

      const fileInput = {
        type: "DAMAGE_REPORT",
        file_url: faker.internet.url(),
        description: "Minor damage on device",
      };

      const response = await fetch(
        `http://localhost:3000/api/v1/rentals/${rental.id}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify(fileInput),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.type).toBe("DAMAGE_REPORT");
      expect(responseBody.description).toBe("Minor damage on device");
    });
  });
});
