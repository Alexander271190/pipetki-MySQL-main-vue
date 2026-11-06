export interface ApiErrorBody {
  error?: string;
  code?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  response: ApiErrorBody;
  constructor(message: string, status: number, code: string, response: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.response = response;
  }
}
