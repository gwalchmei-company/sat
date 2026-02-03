import email from "infra/email";

export async function sendNotification({ channel, params }) {
  if (channel === "EMAIL") {
    return email.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
  }

  throw new Error(`Canal não suportado: ${channel}`);
}
