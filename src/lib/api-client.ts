/**
 * API client with retry logic for 401 responses
 */

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 1
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If 401 and we have retries left, wait a bit and retry
      if (response.status === 401 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        lastResponse = response;
        continue;
      }

      return response;
    } catch (error) {
      // Network error - retry if we have attempts left
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw error;
    }
  }

  // Return last response if all retries failed
  return lastResponse || new Response(null, { status: 401 });
}
