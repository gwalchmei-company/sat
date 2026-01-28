import contract from "models/contract";

export function orderCreatedCustomerTemplateEmail(order, createdBy) {
  return `Olá ${createdBy.username}, 
  seu pedido de ID ${order.id} foi criado com sucesso.
  
  Aguarde a aprovação e processamento do seu pedido.
  Fique atento ao seu e-mail para mais informações. 
  Obrigado por escolher nossos serviços!
  
  Atenciosamente,
  Equipe Gwalchmei
  `;
}

export function orderCreatedAdminTemplateEmail(order, createdBy) {
  return `Um novo pedido foi criado pelo usuário ${createdBy.username} (ID: ${createdBy.id}).
      
Dados do Cliente:
Username: ${createdBy.username}
E-mail: ${createdBy.email}
Celular: ${createdBy.phone || "Não informado"}

Detalhes do pedido:
ID do Pedido: ${order.id}
Período: ${new Date(order.start_date).toLocaleDateString("pt-BR")} - ${new Date(order.end_date).toLocaleDateString("pt-BR")}
Diárias: ${order.start_date && order.end_date ? Math.ceil((new Date(order.end_date) - new Date(order.start_date)) / (1000 * 60 * 60 * 24)) : "Não informado"}
Local de Retirada: ${order.location_refer}
https://www.google.com/maps?q=${order.lat},${order.lng}

Observações: ${order.notes || "Nenhuma"}

Por favor, revise e processe o pedido conforme necessário.
`;
}

export function orderApprovedCustomerTemplateEmail(rental, customer) {
  return `Olá ${customer.username}, seu pedido foi processado e agora está em análise para aprovação!

Detalhes do Aluguel:
Id do aluguel: ${rental.id}
Período: ${new Date(rental.start_date).toLocaleDateString("pt-BR")} - ${new Date(rental.end_date).toLocaleDateString("pt-BR")}
Local de Funcionamento: ${rental.location_refer}
https://www.google.com/maps?q=${rental.lat},${rental.lng}
${
  rental?.notes
    ? `
Observações: ${rental.notes}
`
    : ""
}
Fique atento ao seu e-mail para mais informações sobre a aprovação do seu pedido.
Obrigado por escolher nossos serviços!

Atenciosamente,
Equipe Gwalchmei
  `;
}

export function orderApprovedAdminTemplateEmail(
  approvedBy,
  order,
  rental,
  customer,
) {
  return `Uma Ordem de Serviço foi aprovada por ${approvedBy.username} e requer sua atenção.

Um aluguel foi gerado com os seguintes detalhes:

Id do aluguel: ${rental.id}
Status: ${rental.status}

Cliente: 
Username: ${customer.username}
E-mail: ${customer.email}
Celular: ${customer.phone || "Não informado"}

Detalhes do Pedido:
Id do pedido: ${order.id}
Período: ${new Date(rental.start_date).toLocaleDateString("pt-BR")} - ${new Date(rental.end_date).toLocaleDateString("pt-BR")}
Local de funcionamento: ${rental.location_refer}
https://www.google.com/maps?q=${rental.lat},${rental.lng}


Acesse o painel administrativo para revisar os detalhes do pedido 
Por favor, analise as informações do pedido e tome as medidas necessárias.
`;
}

export function orderRejectedCustomerTemplateEmail(order, customer) {
  return `Olá ${customer.username}, lamentamos informar que seu pedido de ID ${order.id} não atendeu aos critérios necessários para aprovação.
Dentre os motivos possíveis estão:
- Informações incompletas ou incorretas no pedido.
- Falta de documentação necessária.
- Restrições de crédito ou histórico financeiro.
- Outros critérios específicos da empresa.

Se você tiver alguma dúvida ou precisar de mais informações, 
não hesite em entrar em contato conosco.

Atenciosamente,
Equipe Gwalchmei
  `;
}

export function orderCompletedCustomerTemplateEmail(order, customer) {
  return `Olá ${customer.username}, seu pedido de ID ${order.id} foi concluído com sucesso.

Agradecemos por utilizar nossos serviços. Esperamos atendê-lo novamente em breve!

Atenciosamente,
Equipe Gwalchmei
      `;
}

export function orderCanceledCustomerTemplateEmail(order, customer) {
  return `Olá ${customer.username}, seu pedido de ID ${order.id} foi cancelado.

Se você tiver alguma dúvida ou precisar de mais informações, 
não hesite em entrar em contato conosco.

Atenciosamente,
Equipe Gwalchmei
      `;
}

export function orderStatusChangedCustomerTemplateEmail(
  newStatus,
  order,
  customer,
) {
  switch (newStatus) {
    case "rejected":
      return orderRejectedCustomerTemplateEmail(order, customer);
    case "completed":
      return orderCompletedCustomerTemplateEmail(order, customer);
    case "canceled":
      return orderCanceledCustomerTemplateEmail(order, customer);
    default:
      return `Olá ${customer.username}, o status do seu pedido de ID ${order.id} foi atualizado.

Acesse o painel do cliente para mais informações.

Atenciosamente,
Equipe Gwalchmei
      `;
  }
}

export function contractCreatedCustomerTemplateEmail(customer) {
  return `Olá ${customer.username}, 
Temos boas noticias!
  
Um contrato está sendo preparado e em breve estará disponível para assinatura.

Fique atento ao seu e-mail para mais informações. 
Obrigado por escolher nossos serviços!

Atenciosamente,
Equipe Gwalchmei
`;
}

export function contractSentCustomerTemplateEmail(customer) {
  return `Olá ${customer.username}, 
Informamos que o contrato já está pronto para assinatura. 

Instruções de assinatura:
- Confira seu portal do cliente para acessar o contrato;
- Confira atentamente todas as cláusulas do contrato;
- Realize a assinatura conforme as instruções da plataforma.

Prazo para assinatura:
Solicitamos que a assinatura seja realizada até ${new Date(Date.now() + contract.EXPIRATION_IN_MILLISECONDS).toLocaleDateString("pt-BR")}.
  
Caso o contrato não seja assinado dentro do prazo informado, o acordo poderá ser considerado inválido, ficando sujeito a cancelamento ou necessidade de renegociação dos termos.

Se tiver alguma dúvida ou precisar de assistência, 
não hesite em entrar em contato conosco.

Atenciosamente,
Equipe Gwalchmei
`;
}

export function contractSignedCustomerTemplateEmail(
  customer,
  rentalObject,
  contract,
) {
  return `Olá ${customer.username}, 
Confirmamos que o contrato foi assinado com sucesso.
O contrato encontra-se ativo a partir desta data.

Detalhes do Serviço:
Contrato nº: ${contract.contract_number}
Data de Assinatura: ${new Date(contract.signed_at).toLocaleDateString("pt-BR")}

Descrição: Prestação de Serviços de Informática
Período: ${new Date(rentalObject.start_date).toLocaleDateString("pt-BR")} - ${new Date(rentalObject.end_date).toLocaleDateString("pt-BR")}
Local de Funcionamento: ${rentalObject.location_refer}
https://www.google.com/maps?q=${rentalObject.lat},${rentalObject.lng}

As informações para o pagamento estão disponíveis no seu portal do cliente.

Agradecemos por confiar em nossos serviços. 
Estamos à disposição para qualquer dúvida ou assistência que você possa precisar.

Atenciosamente,
Equipe Gwalchmei
`;
}

export function contractSignedAdminTemplateEmail(
  customer,
  rentalObject,
  contract,
) {
  return `Informamos que um contrato foi assinado e se encontra ativo.

Cliente:
Username: ${customer.username}
Documento / ID: ${customer.cpf}

Contrato nº: ${contract.contract_number}
O contrato de ID ${contract.id} foi assinado com sucesso.

Detalhes do Contrato:
ID do Contrato: ${contract.id}
ID do Cliente: ${customer.id}
Data de Assinatura: ${new Date(contract.signed_at).toLocaleDateString("pt-BR")}
Descrição: Prestação de Serviços de Informática
Período: ${new Date(rentalObject.start_date).toLocaleDateString("pt-BR")} - ${new Date(rentalObject.end_date).toLocaleDateString("pt-BR")}
Local de Funcionamento: ${rentalObject.location_refer}
https://www.google.com/maps?q=${rentalObject.lat},${rentalObject.lng}


Por favor, atualize os registros e prossiga com os próximos passos conforme necessário.
`;
}

export function contractCanceledCustomerTemplateEmail(customer, contract) {
  return `Olá ${customer.username}, 
Informamos que o contrato nº ${contract.contract_number} foi cancelado.

Se você tiver alguma dúvida ou precisar de mais informações, 
não hesite em entrar em contato conosco.

Atenciosamente,
Equipe Gwalchmei
      `;
}

export function contractCanceledAdminTemplateEmail(customer, contract) {
  return `Informamos que um contrato foi cancelado.

Cliente:
Username: ${customer.username}
Documento / ID: ${customer.cpf}

Contrato nº: ${contract.contract_number}
O contrato de ID ${contract.id} foi cancelado.

Por favor, atualize os registros e prossiga com os próximos passos conforme necessário.
`;
}
