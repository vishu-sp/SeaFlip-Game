// The external API calls its answer "fish"; the game stores it as "solution".
// API reference: https://marcconrad.com/uob/fish/doc.php
const FISH_API_URL =
  'https://marcconrad.com/uob/fish/api.php?out=json&base64=yes';
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg);base64,/;
const BASE64_PATTERN = /^[A-Za-z0-9+/=\r\n]+$/;

export function parsePuzzle(data) {
  const answer = data?.fish ?? data?.solution;
  if (answer == null) {
    throw new Error('Missing Fish API answer');
  }

  const solution = Number(answer);
  if (
    !Number.isInteger(solution)
    || solution < 0
    || typeof data.question !== 'string'
  ) {
    throw new Error('Invalid Fish API response');
  }

  let image = data.question;
  if (BASE64_PATTERN.test(image)) {
    image = `data:image/png;base64,${image.replace(/\s/g, '')}`;
  }

  if (!IMAGE_DATA_URL_PATTERN.test(image)) {
    throw new Error('Expected a base64 puzzle image');
  }

  return { image, solution };
}

export async function fetchPuzzle() {
  const response = await fetch(FISH_API_URL, {
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error('Fish API unavailable');
  }

  return parsePuzzle(await response.json());
}
