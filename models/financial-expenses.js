import database from "infra/database";
import { ValidationError } from "infra/errors";
import { validate as uuidIsValid } from "uuid";

export const FINANCIAL_EXPENSE_CATEGORIES = [
  "utilities",
  "rent",
  "payroll",
  "taxes",
  "maintenance",
  "supplies",
  "services",
  "transport",
  "marketing",
  "others",
];

async function findOneById(id) {
  if (!uuidIsValid(id)) {
    throw new ValidationError({
      message: "O id informado não foi encontrado ou é inválido.",
      action: "Verifique o id e tente novamente.",
    });
  }

  const financialExpense = await runSelectQuery(id);

  return financialExpense;

  async function runSelectQuery(id) {
    const result = await database.query({
      text: `
        SELECT
          *
        FROM
          financial_expenses
        WHERE
          id = $1
        ;`,
      values: [id],
    });

    return result.rows[0];
  }
}

async function listAll() {
  const financialExpensesList = await runSelectQuery();

  return financialExpensesList;

  async function runSelectQuery() {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          financial_expenses
        ;`,
    });

    return results.rows;
  }
}

async function create(financialExpenseInputValues) {
  const financialExpenseCreated = await runInsertQuery(
    financialExpenseInputValues,
  );

  return financialExpenseCreated;

  async function runInsertQuery(financialExpenseInputValues) {
    if (!financialExpenseInputValues.description) {
      throw new ValidationError({
        message: "Descrição não foi informada.",
        action: "Insira uma descrição válida para realizar esta operação.",
      });
    }

    if (financialExpenseInputValues.description)
      if (!financialExpenseInputValues.amount_in_cents) {
        throw new ValidationError({
          message: "Valor não foi informado.",
          action: "Insira um valor válido para realizar esta operação.",
        });
      }

    if (financialExpenseInputValues.amount_in_cents < 0) {
      throw new ValidationError({
        message: "Valor não pode ser negativo.",
        action: "Insira um valor válido para realizar esta operação.",
      });
    }

    if (financialExpenseInputValues.paid_at) {
      const dueDate = new Date(financialExpenseInputValues.paid_at);
      if (isNaN(dueDate.getTime())) {
        throw new ValidationError({
          message: "Data de pagamento inválida.",
          action:
            "Insira uma data de pagamento válida para realizar esta operação.",
        });
      }
    }

    if (financialExpenseInputValues.due_date_at) {
      const dueDate = new Date(financialExpenseInputValues.due_date_at);
      if (isNaN(dueDate.getTime())) {
        throw new ValidationError({
          message: "Data de vencimento inválida.",
          action:
            "Insira uma data de vencimento válida para realizar esta operação.",
        });
      }
    }

    if (financialExpenseInputValues.category) {
      const isValid = FINANCIAL_EXPENSE_CATEGORIES.includes(
        financialExpenseInputValues.category,
      );

      if (!isValid) {
        throw new ValidationError({
          message: "Categoria inválida.",
          action: `Escolha uma categoria válida. Consulte a documentação para mais detalhes.`,
        });
      }
    }

    const financialExpenseCreated = await database.query({
      text: `
      INSERT INTO financial_expenses
      (
        description,
        amount_in_cents,
        category,
        paid_at,
        due_date_at
      )
      VALUES
      ($1, $2, $3, $4, $5)
      RETURNING
        *
      ;`,
      values: [
        financialExpenseInputValues.description,
        financialExpenseInputValues.amount_in_cents,
        financialExpenseInputValues.category,
        financialExpenseInputValues.paid_at,
        financialExpenseInputValues.due_date_at,
      ],
    });

    return financialExpenseCreated.rows[0];
  }
}

const financial_expense = {
  create,
  listAll,
  findOneById,
};

export default financial_expense;
