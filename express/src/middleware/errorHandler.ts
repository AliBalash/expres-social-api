import { ApiError } from 'bundlesocial';
import { Request, Response, NextFunction } from 'express';
import HttpError from '../errors/HttpError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status ?? 500).json({
      message: err.message,
      details: err.body ?? err,
    });
  }

  console.error(err);

  return res.status(500).json({
    message: 'Internal Server Error',
  });
};

export default errorHandler;
