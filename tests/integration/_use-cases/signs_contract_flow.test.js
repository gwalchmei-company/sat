/* eslint-disable jest/expect-expect */
import { faker } from "@faker-js/faker/.";
import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("Use case: complete contract workflow", () => {
  let admin;
  let customer;
  let device;

  let customerOrder;
  let rental;
  let contract;

  test("customer make a rental request", async () => {
    customer = await orchestrator.createAuthenticatedUser("customer");

    const customerOrderData = {
      customer_id: customer.user.id,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: faker.lorem.sentence(),
      location_refer: faker.location.streetAddress(),
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    };

    customerOrder = await fetch(`http://localhost:3000/api/v1/customerorder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${customer.session.token}`,
      },
      body: JSON.stringify(customerOrderData),
    });

    expect(customerOrder.status).toBe(201);
    customerOrder = await customerOrder.json();

    // eslint-disable-next-line no-undef
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allEmails = await orchestrator.getAllEmails();

    const emailToCustomer = allEmails.find(
      (email) => email.recipients[0] === `<${customer.user.email}>`,
      (email) => email.subject[0] === "Seu pedido foi criado com sucesso!",
    );

    expect(emailToCustomer).toBeDefined();
    expect(emailToCustomer.sender).toBe("<contato@gwalchmei.com.br>");
    expect(emailToCustomer.recipients[0]).toBe(`<${customer.user.email}>`);
    expect(emailToCustomer.text === "").toBe(false);

    const emailToAdmin = allEmails.find(
      (email) => email.recipients.includes("<ryan@gwalchmei.com.br>"),
      (email) =>
        email.subject[0] === `Novo pedido criado - ID ${customerOrder.id}`,
    );

    expect(emailToAdmin).toBeDefined();
    expect(emailToAdmin.sender).toBe("<contato@gwalchmei.com.br>");
    expect(emailToAdmin.recipients).toContain("<ryan@gwalchmei.com.br>");
    expect(emailToAdmin.text === "").toBe(false);
  });

  test("admin approves and create rental from approved customer order", async () => {
    admin = await orchestrator.createAuthenticatedUser("admin");
    device = await orchestrator.createDevice();

    const rentalInput = {
      device_id: device.id,
      customer_id: customer.user.id,
      customer_order_id: customerOrder.id,
      start_date: customerOrder.start_date,
      end_date: customerOrder.end_date,
      notes: faker.lorem.sentence(),
      location_refer: customerOrder.location_refer,
      lat: customerOrder.lat,
      lng: customerOrder.lng,
    };

    const rentalResponse = await fetch(`http://localhost:3000/api/v1/rentals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${admin.session.token}`,
      },
      body: JSON.stringify(rentalInput),
    });

    expect(rentalResponse.status).toBe(201);
    rental = await rentalResponse.json();
    expect(rental.customer_order_id).toBe(customerOrder.id);

    // eslint-disable-next-line no-undef
    await new Promise((resolve) => setTimeout(resolve, 100));
    const allEmails = await orchestrator.getAllEmails();

    const emailToCustomer = allEmails.find(
      (email) =>
        email.recipients.includes(`<${customer.user.email}>`) &&
        email.subject == "Seu pedido foi processado e está em análise!",
    );

    expect(emailToCustomer).toBeDefined();
    expect(emailToCustomer.sender).toBe("<contato@gwalchmei.com.br>");
    expect(emailToCustomer.text === "").toBe(false);

    const emailToAdmin = allEmails.find(
      (email) =>
        email.recipients.includes("<ryan@gwalchmei.com.br>") &&
        email.subject == `Uma Ordem de Serviço foi aprovada`,
    );
    expect(emailToAdmin).toBeDefined();
    expect(emailToAdmin.sender).toBe("<contato@gwalchmei.com.br>");
    expect(emailToAdmin.text === "").toBe(false);
  });

  test("admin creates a contract to rental and sends it to customer", async () => {
    const contractInput = {
      rental_id: rental.id,
      status: "draft",
      contract_number: `CT-${faker.number.int({ min: 100000, max: 999999 })}`,
      version: 1,
      pdf_url: faker.internet.url(),
      file_hash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const reponse = await fetch(`http://localhost:3000/api/v1/contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${admin.session.token}`,
      },
      body: JSON.stringify(contractInput),
    });

    contract = await reponse.json();

    expect(reponse.status).toBe(201);
    expect(contract.rental_id).toBe(rental.id);
    expect(contract.status).toBe("draft");

    // eslint-disable-next-line no-undef
    await new Promise((resolve) => setTimeout(resolve, 100));
    const allEmails = await orchestrator.getAllEmails();

    const emailToCustomer = allEmails.find(
      (email) =>
        email.recipients.includes(`<${customer.user.email}>`) &&
        email.subject == "Contrato criado com sucesso!",
    );

    expect(emailToCustomer).toBeDefined();
    expect(emailToCustomer.sender).toBe("<contato@gwalchmei.com.br>");
    expect(emailToCustomer.text === "").toBe(false);
    expect(emailToCustomer.text).toContain(customer.user.username);
  });

  test("admin sends contract to customer", async () => {
    const sendResponse = await fetch(
      `http://localhost:3000/api/v1/contracts/${contract.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${admin.session.token}`,
        },
        body: JSON.stringify({
          status: "sent",
        }),
      },
    );

    expect(sendResponse.status).toBe(200);
    const sentContract = await sendResponse.json();

    expect(sentContract.status).toBe("sent");
  });

  test("customer views received contract", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/contracts/${contract.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${customer.session.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const receivedContract = await response.json();
    expect(receivedContract).toEqual({
      contract_number: contract.contract_number,
      created_at: contract.created_at,
      customer_email: customer.user.email,
      customer_id: customer.user.id,
      customer_username: customer.user.username,
      device_id: device.id,
      device_model: device.model,
      expires_at: contract.expires_at,
      file_hash: contract.file_hash,
      id: contract.id,
      pdf_url: contract.pdf_url,
      previous_contract_id: contract.previous_contract_id,
      rental_id: rental.id,
      serial_number: device.serial_number,
      signed_at: contract.signed_at,
      signed_by: contract.signed_by,
      status: "sent",
      updated_at: receivedContract.updated_at,
      signed_by_username: null,
      version: 1,
      deleted_at: null,
      deleted_by: null,
      cancel_reason: null,
      canceled_at: null,
      canceled_by: null,
    });

    expect(receivedContract.updated_at > contract.updated_at).toBe(true);
  });

  test("customer signs contract after receiving it", async () => {
    const signResponse = await fetch(
      `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
      {
        method: "POST",
        headers: {
          Cookie: `session_id=${customer.session.token}`,
        },
      },
    );

    expect(signResponse.status).toBe(200);
    const signedContract = await signResponse.json();

    expect(signedContract.status).toBe("signed");
    expect(signedContract.signed_by).toBe(customer.user.id);
    expect(signedContract.signed_at).not.toBeNull();

    // Verify contract cannot be signed again
    const resignResponse = await fetch(
      `http://localhost:3000/api/v1/contracts/${contract.id}/sign`,
      {
        method: "POST",
        headers: {
          Cookie: `session_id=${customer.session.token}`,
        },
      },
    );

    expect(resignResponse.status).toBe(400);
  });

  test("admin views signed contract", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/contracts/${contract.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${admin.session.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const signedContract = await response.json();
    expect(signedContract.status).toBe("signed");
    expect(signedContract.signed_by).toBe(customer.user.id);
    expect(signedContract.signed_at).not.toBeNull();
  });

  test("Operator view signed contract", async () => {
    const operator = await orchestrator.createAuthenticatedUser("operator");

    const response = await fetch(
      `http://localhost:3000/api/v1/contracts/${contract.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${operator.session.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const signedContract = await response.json();
    expect(signedContract.status).toBe("signed");
    expect(signedContract.signed_by).toBe(customer.user.id);
    expect(signedContract.signed_at).not.toBeNull();
  });
});
