export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function api<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    throw new ApiError(
      typeof data === 'object' && data !== null && 'error' in data
        ? (data as { error: string }).error
        : `请求失败 (${res.status})`,
      res.status,
      data
    );
  }

  const json: ApiResponse<T> = await res.json();
  if (json.success && json.data !== undefined) {
    return json.data;
  }
  return json as unknown as T;
}
