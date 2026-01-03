import database from "infra/database";
import { NotFoundError, ValidationError } from "infra/errors";
import { validate as isValidUuid } from "uuid";

const CUSTOMER_ORDER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "canceled",
];

async function listAll() {
  const ordersList = await runSelectQuery();
  return ordersList;

  async function runSelectQuery() {
    const results = await database.query({
      text: `
        SELECT
          customer_order.*,
          users.username,
          users.email,
          users.cpf,
          users.phone,
          users.address,
          users.created_at AS customer_created_at
        FROM
          customer_order
          INNER JOIN users ON users.id = customer_order.customer_id
        WHERE
          customer_order.deleted_at IS NULL
        ;`,
    });

    return results.rows;
  }
}

async function listByCustomerId(customerId) {
  const ordersList = await runSelectQuery(customerId);
  return ordersList;

  async function runSelectQuery(customerId) {
    const results = await database.query({
      text: `
        SELECT
          customer_order.*,
          users.username,
          users.email,
          users.cpf,
          users.phone,
          users.address,
          users.created_at AS customer_created_at
        FROM
          customer_order
          INNER JOIN users ON users.id = customer_order.customer_id
        WHERE
          customer_order.customer_id = $1 
        AND 
          customer_order.deleted_at IS NULL
        ;`,
      values: [customerId],
    });

    return results.rows;
  }
}

async function findOneById(id) {
  if (!isValidUuid(id)) {
    throw new ValidationError({
      message: "O id do pedido de cliente é inválido.",
      action: "Verifique o id do pedido de cliente e tente novamente.",
    });
  }
  const orderFound = await runSelectQuery(id);
  return orderFound;

  async function runSelectQuery(id) {
    const results = await database.query({
      text: `
        SELECT
          customer_order.*,
          users.username,
          users.email,
          users.cpf,
          users.phone,
          users.address,
          users.created_at AS customer_created_at
        FROM
          customer_order
          INNER JOIN users ON users.id = customer_order.customer_id
        WHERE
          customer_order.id = $1
        ;`,
      values: [id],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "Pedido de cliente não encontrado ou inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
      });
    }

    return results.rows[0];
  }
}

async function create(orderObject) {
  await validationFields(orderObject);

  const createdRental = await runInsertQuery(orderObject);

  return createdRental;

  async function runInsertQuery(orderObject) {
    const customerOrderCreated = await database.query({
      text: `
      INSERT INTO customer_order
        (customer_id, start_date, end_date, status, notes, location_refer, lat, lng)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        *
      ;`,
      values: [
        orderObject.customer_id,
        orderObject.start_date,
        orderObject.end_date,
        orderObject.status,
        orderObject.notes,
        orderObject.location_refer,
        orderObject.lat,
        orderObject.lng,
      ],
    });

    return customerOrderCreated.rows[0];
  }

  async function validationFields(orderObject) {
    if (!orderObject.status) {
      orderObject.status = "pending";
    }
    if (!orderObject.customer_id) {
      throw new ValidationError({
        message: "O id do cliente não foi encontrado ou é inválido.",
        action: "Verifique o id do cliente enviado e tente novamente.",
      });
    }

    if (!orderObject.start_date) {
      throw new ValidationError({
        message: "É necessário preencher uma data de início.",
        action:
          "Verifique se a data de início foi preenchida e tente novamente.",
      });
    }
    if (!orderObject.end_date) {
      throw new ValidationError({
        message: "É necessário preencher uma data de término.",
        action:
          "Verifique se a data de término foi preenchida e tente novamente.",
      });
    }
  }
}

async function update(orderId, orderObject) {
  await validateFields(orderObject);
  const currentOrder = await findOneById(orderId);
  const orderWithNewValues = { ...currentOrder, ...orderObject };

  const updatedOrder = await runUpdateQuery(orderWithNewValues);
  return updatedOrder;

  async function runUpdateQuery(orderObject) {
    const result = await database.query({
      text: `
        UPDATE 
          customer_order
        SET
          customer_id = $1,
          start_date = $2,
          end_date = $3,
          status = $4,
          notes = $5,
          location_refer = $6,
          lat = $7,
          lng = $8,
          updated_at = timezone('utc', now())
        WHERE id = $9
        RETURNING *
      `,
      values: [
        orderObject.customer_id,
        orderObject.start_date,
        orderObject.end_date,
        orderObject.status,
        orderObject.notes,
        orderObject.location_refer,
        orderObject.lat,
        orderObject.lng,
        orderObject.id,
      ],
    });

    return result.rows[0];
  }

  async function validateFields(orderObject) {
    if (!orderObject || Object.keys(orderObject).length === 0) {
      throw new ValidationError({
        message: "O corpo da requisição está vazio ou inválido.",
        action: "Verifique os dados enviados e tente novamente.",
        status_code: 400,
      });
    }

    if (orderObject.status) {
      if (!CUSTOMER_ORDER_STATUSES.includes(orderObject.status)) {
        throw new ValidationError({
          message: `O status informado é inválido.`,
          action: `Verifique os status permitidos e tente novamente.`,
        });
      }
    }

    if (orderObject.lat) {
      const isValidLat = orderObject.lat >= -90 && orderObject.lat <= 90;
      if (!isValidLat) {
        throw new ValidationError({
          message: `A latitude informada é inválida.`,
          action: `Verifique o valor da latitude e tente novamente.`,
        });
      }
    }

    if (orderObject.lng) {
      const isValidLng = orderObject.lng >= -180 && orderObject.lng <= 180;
      if (!isValidLng) {
        throw new ValidationError({
          message: `A longitude informada é inválida.`,
          action: `Verifique o valor da longitude e tente novamente.`,
        });
      }
    }

    if (orderObject.start_date && orderObject.end_date) {
      const startDate = new Date(orderObject.start_date);
      const endDate = new Date(orderObject.end_date);
      if (startDate >= endDate) {
        throw new ValidationError({
          message: `A data de término não pode ser anterior à data de início.`,
          action: `Verifique as datas informadas e tente novamente.`,
        });
      }
    }
  }
}

async function Delete(orderId) {
  const orderToDelete = await validateOrder(orderId);
  await runDeleteQuery(orderToDelete.id);

  async function runDeleteQuery(id) {
    await database.query({
      text: `
        UPDATE 
          customer_order
        SET
          deleted_at = timezone('utc', now())
        WHERE id = $1
        `,
      values: [id],
    });
  }

  async function validateOrder(orderId) {
    const existingOrder = await findOneById(orderId);

    if (existingOrder.deleted_at !== null) {
      throw new NotFoundError({
        message: "Pedido de cliente não encontrado ou inválido.",
        action: "Verifique o id do pedido de cliente e tente novamente.",
      });
    }

    return existingOrder;
  }
}

const customerOrder = {
  create,
  listAll,
  listByCustomerId,
  findOneById,
  update,
  Delete,
};

export default customerOrder;
