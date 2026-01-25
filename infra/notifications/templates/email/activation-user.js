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

export function userActivatedTemplateEmail(user) {
  return `Olá ${user.username}, seu cadastro foi ativado com sucesso!
      
Agora você já pode acessar sua conta e aproveitar nossos serviços.
Basta fazer login com seu e-mail e senha cadastrados.

${webserver.origin}/login

Se tiver alguma dúvida, entre em contato conosco.
Obrigado por escolher nossos serviços!

Atenciosamente,
Equipe Gwalchmei
    `;
}
