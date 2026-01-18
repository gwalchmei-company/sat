import { cpf } from "cpf-cnpj-validator";

function extractUUID(text) {
  const match = text.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/g,
  );
  return match ? match[0] : null;
}

const orchestrator = {
  extractUUID,
  cpf: {
    isValid: cpf.isValid,
    format: cpf.format,
    generate: cpf.generate,
  },
};

export default orchestrator;
