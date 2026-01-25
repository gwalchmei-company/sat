import { emailHttpUrl } from "./infra.orchestrator";

async function getAllEmails() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();

  if (!emailListBody || emailListBody.length === 0) {
    return [];
  }

  for (const emailItem of emailListBody) {
    emailItem.text = await getTextById(emailItem.id);
  }

  return emailListBody;
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  lastEmailItem.text = await getTextById(lastEmailItem.id);
  return lastEmailItem;
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getTextById(id) {
  const emailTextResponse = await fetch(`${emailHttpUrl}/messages/${id}.plain`);
  const emailTextBody = await emailTextResponse.text();
  return emailTextBody;
}

const orchestrator = {
  getLastEmail,
  deleteAllEmails,
  getAllEmails,
};

export default orchestrator;
