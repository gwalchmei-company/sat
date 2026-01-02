import database from "infra/database";
import { ValidationError } from "infra/errors";

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

const customerOrder = {
  create,
};

export default customerOrder;
