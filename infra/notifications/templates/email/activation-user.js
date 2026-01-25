import webserver from "infra/webserver";

export function activationUserTemplateEmail(user, activationToken) {
  return `${user.username}, clique no link abaixo para ativar seu cadastro no Gwalchmei.

${webserver.origin}/cadastro/ativar/${activationToken.id}

Atenciosamente,
Equipe Gwalchmei`;
}
