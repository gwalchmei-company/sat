import email from "infra/email";

export async function sendNotification({ channel, params }) {
  if (channel === "EMAIL") {
    console.log("EVENNTO FUNCIONAASDADSADASDASDASDNDO", channel, params);

    return email.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
  }

  throw new Error(`Canal não suportado: ${channel}`);
}
