import database from "infra/database";
import { ValidationError } from "infra/errors";
import { validate as isValidUuid } from "uuid";
import rental from "models/rental";

const PAYMENT_METHODS = ["PIX", "CASH", "CARD", "TRANSFER", "BANK_SLIP"];

async function create(financialIncomeObject) {
  await validateFields(financialIncomeObject);
  const createdFinancialIncome = await runInsertQuery(financialIncomeObject);
  return createdFinancialIncome;

  async function validateFields(financialIncomeObject) {
    if (!financialIncomeObject) {
      throw new ValidationError({
        message: "Os dados da receita financeira não foram informados.",
        action: "Informe os dados da receita financeira e tente novamente.",
      });
    }

    if (!financialIncomeObject.rental_id) {
      throw new ValidationError({
        message: "O id do aluguel não foi informado.",
        action: "Informe o id do aluguel e tente novamente.",
      });
    }

    if (!isValidUuid(financialIncomeObject.rental_id)) {
      throw new ValidationError({
        message: "O id do aluguel não é válido.",
        action: "Informe um id válido e tente novamente.",
      });
    }

    await rental.findOneById(financialIncomeObject.rental_id);

    if (financialIncomeObject.amount_in_cents === undefined) {
      throw new ValidationError({
        message: "O valor não foi informado.",
        action: "Informe um valor válido para realizar esta operação.",
      });
    }

    if (typeof financialIncomeObject.amount_in_cents !== "number") {
      throw new ValidationError({
        message: "O valor deve ser um número.",
        action: "Informe um valor válido para realizar esta operação.",
      });
    }

    if (financialIncomeObject.amount_in_cents < 0) {
      throw new ValidationError({
        message: "O valor não pode ser negativo.",
        action: "Informe um valor válido para realizar esta operação.",
      });
    }

    if (!financialIncomeObject.payment_method) {
      throw new ValidationError({
        message: "O método de pagamento não foi informado.",
        action: "Informe um método de pagamento válido.",
      });
    }

    if (!PAYMENT_METHODS.includes(financialIncomeObject.payment_method)) {
      throw new ValidationError({
        message: `O método de pagamento "${financialIncomeObject.payment_method}" não é válido.`,
        action: `Informe um dos métodos válidos: ${PAYMENT_METHODS.join(", ")}.`,
      });
    }

    if (!financialIncomeObject.received_at) {
      throw new ValidationError({
        message: "A data de recebimento não foi informada.",
        action: "Informe uma data de recebimento válida.",
      });
    }

    const receivedDate = new Date(financialIncomeObject.received_at);
    if (isNaN(receivedDate.getTime())) {
      throw new ValidationError({
        message: "A data de recebimento é inválida.",
        action: "Insira uma data de recebimento válida.",
      });
    }

    if (financialIncomeObject.reference_date) {
      const referenceDate = new Date(financialIncomeObject.reference_date);
      if (isNaN(referenceDate.getTime())) {
        throw new ValidationError({
          message: "A data de referência é inválida.",
          action: "Insira uma data de referência válida.",
        });
      }
    }

    if (
      financialIncomeObject.description &&
      typeof financialIncomeObject.description !== "string"
    ) {
      throw new ValidationError({
        message: "A descrição deve ser uma string.",
        action: "Informe uma descrição válida.",
      });
    }

    if (financialIncomeObject.installment_number !== undefined) {
      if (typeof financialIncomeObject.installment_number !== "number") {
        throw new ValidationError({
          message: "O número da parcela deve ser um número.",
          action: "Informe um número de parcela válido.",
        });
      }

      if (financialIncomeObject.installment_number < 1) {
        throw new ValidationError({
          message: "O número da parcela deve ser maior ou igual a 1.",
          action: "Informe um número de parcela válido.",
        });
      }
    }

    if (financialIncomeObject.total_installments !== undefined) {
      if (typeof financialIncomeObject.total_installments !== "number") {
        throw new ValidationError({
          message: "O total de parcelas deve ser um número.",
          action: "Informe um total de parcelas válido.",
        });
      }

      if (financialIncomeObject.total_installments < 1) {
        throw new ValidationError({
          message: "O total de parcelas deve ser maior ou igual a 1.",
          action: "Informe um total de parcelas válido.",
        });
      }

      if (
        financialIncomeObject.installment_number &&
        financialIncomeObject.installment_number >
          financialIncomeObject.total_installments
      ) {
        throw new ValidationError({
          message:
            "O número da parcela não pode ser maior que o total de parcelas.",
          action: "Verifique os valores informados.",
        });
      }
    }

    if (
      financialIncomeObject.installment_number &&
      !financialIncomeObject.total_installments
    ) {
      throw new ValidationError({
        message:
          "Ao informar o número da parcela, é necessário informar o total de parcelas.",
        action: "Informe o total de parcelas.",
      });
    }

    if (
      financialIncomeObject.transaction_id &&
      typeof financialIncomeObject.transaction_id !== "string"
    ) {
      throw new ValidationError({
        message: "O ID da transação deve ser uma string.",
        action: "Informe um ID de transação válido.",
      });
    }

    if (
      financialIncomeObject.notes &&
      typeof financialIncomeObject.notes !== "string"
    ) {
      throw new ValidationError({
        message: "As observações devem ser uma string.",
        action: "Informe observações válidas.",
      });
    }
  }

  async function runInsertQuery(financialIncomeObject) {
    const result = await database.query({
      text: `
        INSERT INTO financial_income
          (
            rental_id,
            amount_in_cents,
            payment_method,
            received_at,
            reference_date,
            description,
            installment_number,
            total_installments,
            transaction_id,
            notes
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          *
        ;`,
      values: [
        financialIncomeObject.rental_id,
        financialIncomeObject.amount_in_cents,
        financialIncomeObject.payment_method,
        financialIncomeObject.received_at,
        financialIncomeObject.reference_date || null,
        financialIncomeObject.description || null,
        financialIncomeObject.installment_number || null,
        financialIncomeObject.total_installments || null,
        financialIncomeObject.transaction_id || null,
        financialIncomeObject.notes || null,
      ],
    });

    return result.rows[0];
  }
}

export default Object.freeze({
  create,
  PAYMENT_METHODS,
});
