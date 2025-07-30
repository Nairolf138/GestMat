class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (msg) => new ApiError(400, msg);
const unauthorized = (msg) => new ApiError(401, msg);
const forbidden = (msg) => new ApiError(403, msg);
const notFound = (msg) => new ApiError(404, msg);

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
};
