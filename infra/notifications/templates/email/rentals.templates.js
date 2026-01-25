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
