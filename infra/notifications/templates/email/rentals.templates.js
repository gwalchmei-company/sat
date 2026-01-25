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
  return `Olá ${customer.username}, lamentamos informar que seu pedido de ID ${order.id} foi rejeitado.

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
