type ApiResponsePayload = {
  success?: boolean;
  message?: string;
  error?: string;
};

function cleanResponsePreview(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function buildStatusLabel(response: Response) {
  return response.statusText
    ? `${response.status} ${response.statusText}`
    : String(response.status);
}

export async function readApiJson<T extends ApiResponsePayload>(
  response: Response,
  fallbackMessage: string
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const responseText = await response.text();
    const preview = cleanResponsePreview(responseText);
    const statusLabel = buildStatusLabel(response);

    throw new Error(
      preview
        ? `${fallbackMessage} Respons server bukan JSON (${statusLabel}): ${preview}`
        : `${fallbackMessage} Respons server bukan JSON (${statusLabel}).`
    );
  }

  const json = (await response.json()) as T;

  if (!response.ok || json.success === false) {
    throw new Error(json.message ?? json.error ?? fallbackMessage);
  }

  return json;
}
