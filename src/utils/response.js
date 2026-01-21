export const successResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (message, statusCode = 500, errors = null) => {
  return {
    success: false,
    message,
    statusCode,
    errors,
  };
};

export const paginatedResponse = (data, pagination) => {
  return {
    success: true,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  };
};
