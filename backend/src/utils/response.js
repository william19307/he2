export function success(res, data = null, message = 'success') {
  return res.json({
    code: 0,
    message,
    data,
    timestamp: Date.now(),
  });
}

export function fail(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    code,
    message,
    data: null,
    timestamp: Date.now(),
  });
}

export function paginate(res, { list, total, page, pageSize }) {
  return res.json({
    code: 0,
    message: 'success',
    data: {
      list,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    },
    timestamp: Date.now(),
  });
}
