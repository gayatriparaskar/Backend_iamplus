const errorResponse = (status, message, error) => {
  const response = {
    status,
    success: false,
    message,
  };
  if (error !== undefined) response.error = error;
  return response;
};

const successResponse = (status, message, result) => {
  const response = {
    status,
    success: true,
    message,
  };
  if (result !== undefined) response.result = result;
  return response;
};

module.exports = { successResponse, errorResponse };
