export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

// Thrown anywhere in the request lifecycle; the central error handler
// converts it into the standard { success: false, error: { code, message } } shape.
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.name = "ApiError";
  }

  static badRequest(message: string) {
    return new ApiError("BAD_REQUEST", message);
  }
  static unauthenticated(message = "Authentication is required.") {
    return new ApiError("UNAUTHENTICATED", message);
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError("FORBIDDEN", message);
  }
  static notFound(message = "Resource not found.") {
    return new ApiError("NOT_FOUND", message);
  }
  static conflict(message: string) {
    return new ApiError("CONFLICT", message);
  }
}
