import { google } from 'googleapis';

const DEFAULT_GMAIL_USER = 'hudson.liao@kefirkultures.com';

export function isGmailConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function findPdfAttachments(parts = [], found = []) {
  for (const part of parts) {
    if (part.parts?.length) findPdfAttachments(part.parts, found);
    const filename = part.filename || '';
    if ((part.mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) && part.body?.attachmentId) {
      found.push({ filename: filename || 'certificate-of-analysis.pdf', attachmentId: part.body.attachmentId });
    }
  }
  return found;
}

export async function fetchCremcoCoaAttachments({ sinceQuery = '' } = {}) {
  if (!isGmailConfigured()) throw new Error('Gmail import not configured');

  const oauth2 = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth: oauth2 });
  const userId = process.env.GMAIL_USER || DEFAULT_GMAIL_USER;
  const coaTerms = '(from:(cremco.ca) OR "CoA" OR "Certificate of Analysis") has:attachment filename:pdf';
  const q = [coaTerms, sinceQuery].filter(Boolean).join(' ');
  const messages = [];
  let pageToken;

  do {
    const response = await gmail.users.messages.list({ userId, q, pageToken, maxResults: 100 });
    messages.push(...(response.data.messages || []));
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  const imports = [];
  for (const item of messages) {
    const response = await gmail.users.messages.get({ userId, id: item.id, format: 'full' });
    const message = response.data;
    const headers = Object.fromEntries((message.payload?.headers || []).map(h => [h.name.toLowerCase(), h.value]));
    const attachments = findPdfAttachments(message.payload?.parts || []);

    for (const attachment of attachments) {
      const downloaded = await gmail.users.messages.attachments.get({
        userId,
        messageId: message.id,
        id: attachment.attachmentId,
      });
      if (!downloaded.data.data) continue;
      imports.push({
        messageId: message.id,
        filename: attachment.filename,
        from: headers.from || '',
        date: headers.date || '',
        buffer: decodeBase64Url(downloaded.data.data),
      });
    }
  }

  return imports;
}
