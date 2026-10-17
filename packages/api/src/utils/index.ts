import { StatusError } from './errors';
import type { Response, Request, NextFunction } from 'express';
import Validator from 'validatorjs';

export function error<T>(status: number, message: string, data?: T): StatusError<T> {
  return new StatusError<T>(status, message, data);
}

export const validate =
  (rules: Validator.Rules, customErrorMessages?: Validator.ErrorMessages) =>
  (req: Request, res: Response, next: NextFunction) => {
    const validator = new Validator(req, rules, customErrorMessages);

    if (validator.fails()) {
      return next(error(400, 'Bad Request', validator.errors.all()));
    }

    next();
  };
