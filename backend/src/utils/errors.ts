export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg: string): ApiError => new ApiError(400, msg);
export const unauthorized = (msg: string): ApiError => new ApiError(401, msg);
export const forbidden = (msg: string): ApiError => new ApiError(403, msg);
export const notFound = (msg: string): ApiError => new ApiError(404, msg);
