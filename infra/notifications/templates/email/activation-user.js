import webserver from "infra/webserver";
import activation from "models/activation";

export function activationUserTemplateEmail(user, activationToken) {
  return `Olá ${user.username}, seja bem-vindo(a)!
  
Clique no link abaixo para ativar seu cadastro no LinkRental.
${webserver.origin}/cadastro/ativar/${activationToken.id}

O código expira em ${activation.EXPIRATION_IN_MILLISECONDS / 60000} minutos.


Atenciosamente,
Equipe Gwalchmei`;
}
