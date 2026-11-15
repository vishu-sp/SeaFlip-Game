// Keep requests here so the rest of the frontend does not need to handle tokens.
import { token } from './auth.js';

export async function api(route, body) {
  const requestOptions = {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(20_000),
  };

  if (body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${route}`, requestOptions);
  const data = await response.json().catch(() => ({
    error: 'Server unavailable. Retry shortly.',
  }));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed. Please retry.');
  }

  return data;
}
