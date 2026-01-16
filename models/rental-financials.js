import database from "infra/database";
import { ValidationError } from "infra/errors";
import { validate as isValidUuid } from "uuid";
import rental from "models/rental";

async function listAll() {
  const rentalFinancialsList = await runSelectQuery();
  return rentalFinancialsList;

  async function runSelectQuery() {
    const results = await database.query({
      text: `
        SELECT
          rental_financials.*,
          rentals.start_date,
          rentals.end_date,
          rentals.status AS rental_status,
          devices.serial_number,
          devices.model AS device_model,
          users.username,
          users.email,
          users.cpf
        FROM
          rental_financials
          INNER JOIN rentals ON rentals.id = rental_financials.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
        WHERE
          rental_financials.deleted_at IS NULL
        ORDER BY
          rental_financials.created_at DESC
        ;`,
    });

    return results.rows;
  }
}

async function listByCustomerId(customerId) {
  const rentalFinancialsList = await runSelectQuery(customerId);
  return rentalFinancialsList;

  async function runSelectQuery(customerId) {
    const results = await database.query({
      text: `
        SELECT
          rental_financials.*,
          rentals.start_date,
          rentals.end_date,
          rentals.status AS rental_status,
          devices.serial_number,
          devices.model AS device_model,
          users.username,
          users.email,
          users.cpf
        FROM
          rental_financials
          INNER JOIN rentals ON rentals.id = rental_financials.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
        WHERE
          rentals.customer_id = $1
        AND
          rental_financials.deleted_at IS NULL
        ORDER BY
          rental_financials.created_at DESC
        ;`,
      values: [customerId],
    });

    return results.rows;
  }
}

async function findOneById(id) {
  if (!isValidUuid(id)) {
    throw new ValidationError({
      message: "O id informado não foi encontrado ou é inválido.",
      action: "Verifique o id e tente novamente.",
    });
  }

  const rentalFinancialFound = await runSelectQuery(id);
  return rentalFinancialFound;

  async function runSelectQuery(id) {
    const results = await database.query({
      text: `
        SELECT
          rental_financials.*,
          rentals.customer_id,
          rentals.start_date,
          rentals.end_date,
          rentals.status AS rental_status,
          devices.serial_number,
          devices.model AS device_model,
          users.username,
          users.email,
          users.cpf
        FROM
          rental_financials
          INNER JOIN rentals ON rentals.id = rental_financials.rental_id
          INNER JOIN devices ON devices.id = rentals.device_id
          INNER JOIN users ON users.id = rentals.customer_id
        WHERE
          rental_financials.id = $1
        AND
          rental_financials.deleted_at IS NULL
        LIMIT
          1
        ;`,
      values: [id],
    });

    if (results.rowCount === 0) {
      throw new ValidationError({
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id está digitado corretamente.",
      });
    }

    return results.rows[0];
  }
}

async function create(rentalFinancialObject) {
  await validationFields(rentalFinancialObject);
  const createdRentalFinancial = await runInsertQuery(rentalFinancialObject);
  return createdRentalFinancial;

  async function runInsertQuery(rentalFinancialObject) {
    const result = await database.query({
      text: `
        INSERT INTO rental_financials
          (rental_id, daily_price_in_cents, total_price_in_cents, deposit_in_cents, discount_in_cents, final_price_in_cents)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING
          *
        ;`,
      values: [
        rentalFinancialObject.rental_id,
        rentalFinancialObject.daily_price_in_cents,
        rentalFinancialObject.total_price_in_cents,
        rentalFinancialObject.deposit_in_cents || 0,
        rentalFinancialObject.discount_in_cents || 0,
        rentalFinancialObject.final_price_in_cents,
      ],
    });

    return result.rows[0];
  }

  async function validationFields(rentalFinancialObject) {
    if (!rentalFinancialObject.rental_id) {
      throw new ValidationError({
        message: "O id do aluguel não foi informado.",
        action: "Informe o id do aluguel e tente novamente.",
      });
    }

    if (!isValidUuid(rentalFinancialObject.rental_id)) {
      throw new ValidationError({
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
      });
    }

    await rental.findOneById(rentalFinancialObject.rental_id);

    const existingRentalFinancial = await checkExistingRentalFinancial(
      rentalFinancialObject.rental_id,
    );

    if (existingRentalFinancial) {
      throw new ValidationError({
        message: "Já existe um registro financeiro para este aluguel.",
        action: "Cada aluguel pode ter apenas um registro financeiro.",
      });
    }

    if (
      !rentalFinancialObject.daily_price_in_cents &&
      rentalFinancialObject.daily_price_in_cents !== 0
    ) {
      throw new ValidationError({
        message: "O preço diário não foi informado.",
        action: "Informe o preço diário e tente novamente.",
      });
    }

    if (
      typeof rentalFinancialObject.daily_price_in_cents !== "number" ||
      rentalFinancialObject.daily_price_in_cents <= 0 ||
      !Number.isInteger(rentalFinancialObject.daily_price_in_cents)
    ) {
      throw new ValidationError({
        message: "O preço diário deve ser um número inteiro maior que zero.",
        action: "Informe um preço diário válido e tente novamente.",
      });
    }

    if (
      !rentalFinancialObject.total_price_in_cents &&
      rentalFinancialObject.total_price_in_cents !== 0
    ) {
      throw new ValidationError({
        message: "O preço total não foi informado.",
        action: "Informe o preço total e tente novamente.",
      });
    }

    if (
      typeof rentalFinancialObject.total_price_in_cents !== "number" ||
      rentalFinancialObject.total_price_in_cents <= 0 ||
      !Number.isInteger(rentalFinancialObject.total_price_in_cents)
    ) {
      throw new ValidationError({
        message: "O preço total deve ser um número inteiro maior que zero.",
        action: "Informe um preço total válido e tente novamente.",
      });
    }

    if (!rentalFinancialObject.final_price_in_cents) {
      throw new ValidationError({
        message: "O preço final não foi informado.",
        action: "Informe o preço final e tente novamente.",
      });
    }

    if (
      typeof rentalFinancialObject.final_price_in_cents !== "number" ||
      rentalFinancialObject.final_price_in_cents <= 0 ||
      !Number.isInteger(rentalFinancialObject.final_price_in_cents)
    ) {
      throw new ValidationError({
        message: "O preço final deve ser um número inteiro maior que zero.",
        action: "Informe um preço final válido e tente novamente.",
      });
    }

    if (
      rentalFinancialObject.deposit_in_cents !== undefined &&
      rentalFinancialObject.deposit_in_cents !== null
    ) {
      if (
        typeof rentalFinancialObject.deposit_in_cents !== "number" ||
        rentalFinancialObject.deposit_in_cents < 0 ||
        !Number.isInteger(rentalFinancialObject.deposit_in_cents)
      ) {
        throw new ValidationError({
          message:
            "O depósito deve ser um número inteiro maior ou igual a zero.",
          action: "Informe um depósito válido e tente novamente.",
        });
      }
    }

    if (
      rentalFinancialObject.discount_in_cents !== undefined &&
      rentalFinancialObject.discount_in_cents !== null
    ) {
      if (
        typeof rentalFinancialObject.discount_in_cents !== "number" ||
        rentalFinancialObject.discount_in_cents < 0 ||
        !Number.isInteger(rentalFinancialObject.discount_in_cents)
      ) {
        throw new ValidationError({
          message:
            "O desconto deve ser um número inteiro maior ou igual a zero.",
          action: "Informe um desconto válido e tente novamente.",
        });
      }
    }
  }

  async function checkExistingRentalFinancial(rentalId) {
    const result = await database.query({
      text: `
        SELECT * FROM rental_financials
        WHERE rental_id = $1
        AND deleted_at IS NULL
        ;`,
      values: [rentalId],
    });

    return result.rows[0];
  }
}

async function update(id, rentalFinancialInputValues) {
  const currentRentalFinancial = await findOneById(id);
  const rentalFinancialWithNewValues = {
    ...currentRentalFinancial,
    ...rentalFinancialInputValues,
  };
  validateUpdateFields(rentalFinancialInputValues);

  const updatedRentalFinancial = await runUpdateQuery(
    rentalFinancialWithNewValues,
  );
  return updatedRentalFinancial;

  async function runUpdateQuery(rentalFinancialWithNewValues) {
    const results = await database.query({
      text: `
        UPDATE
          rental_financials
        SET
          daily_price_in_cents = $2,
          total_price_in_cents = $3,
          deposit_in_cents = $4,
          discount_in_cents = $5,
          final_price_in_cents = $6,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      `,
      values: [
        rentalFinancialWithNewValues.id,
        rentalFinancialWithNewValues.daily_price_in_cents,
        rentalFinancialWithNewValues.total_price_in_cents,
        rentalFinancialWithNewValues.deposit_in_cents,
        rentalFinancialWithNewValues.discount_in_cents,
        rentalFinancialWithNewValues.final_price_in_cents,
      ],
    });
    return results.rows[0];
  }

  function validateUpdateFields(input) {
    if (
      input.daily_price_in_cents !== undefined &&
      input.daily_price_in_cents !== null
    ) {
      if (
        typeof input.daily_price_in_cents !== "number" ||
        input.daily_price_in_cents <= 0 ||
        !Number.isInteger(input.daily_price_in_cents)
      ) {
        throw new ValidationError({
          message: "O preço diário deve ser um número inteiro maior que zero.",
          action: "Informe um preço diário válido e tente novamente.",
        });
      }
    }

    if (
      input.total_price_in_cents !== undefined &&
      input.total_price_in_cents !== null
    ) {
      if (
        typeof input.total_price_in_cents !== "number" ||
        input.total_price_in_cents <= 0 ||
        !Number.isInteger(input.total_price_in_cents)
      ) {
        throw new ValidationError({
          message: "O preço total deve ser um número inteiro maior que zero.",
          action: "Informe um preço total válido e tente novamente.",
        });
      }
    }

    if (
      input.final_price_in_cents !== undefined &&
      input.final_price_in_cents !== null
    ) {
      if (
        typeof input.final_price_in_cents !== "number" ||
        input.final_price_in_cents <= 0 ||
        !Number.isInteger(input.final_price_in_cents)
      ) {
        throw new ValidationError({
          message: "O preço final deve ser um número inteiro maior que zero.",
          action: "Informe um preço final válido e tente novamente.",
        });
      }
    }

    if (
      input.deposit_in_cents !== undefined &&
      input.deposit_in_cents !== null
    ) {
      if (
        typeof input.deposit_in_cents !== "number" ||
        input.deposit_in_cents < 0 ||
        !Number.isInteger(input.deposit_in_cents)
      ) {
        throw new ValidationError({
          message:
            "O depósito deve ser um número inteiro maior ou igual a zero.",
          action: "Informe um depósito válido e tente novamente.",
        });
      }
    }

    if (
      input.discount_in_cents !== undefined &&
      input.discount_in_cents !== null
    ) {
      if (
        typeof input.discount_in_cents !== "number" ||
        input.discount_in_cents < 0 ||
        !Number.isInteger(input.discount_in_cents)
      ) {
        throw new ValidationError({
          message:
            "O desconto deve ser um número inteiro maior ou igual a zero.",
          action: "Informe um desconto válido e tente novamente.",
        });
      }
    }
  }
}

async function Delete(id) {
  const rentalFinancialToDelete = await findOneById(id);

  await runDeleteQuery(rentalFinancialToDelete.id);
  return;

  async function runDeleteQuery(id) {
    await database.query({
      text: `
        UPDATE
          rental_financials
        SET
          deleted_at = timezone('utc', now())
        WHERE
          id = $1
        ;`,
      values: [id],
    });
  }
}

export default Object.freeze({
  listAll,
  listByCustomerId,
  findOneById,
  create,
  update,
  Delete,
});
