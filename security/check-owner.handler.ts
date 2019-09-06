import * as restify from 'restify'
import { ForbiddenError } from 'restify-errors';

export const checkOwner: restify.RequestHandler = (req, resp, next) => {
  if (req.authenticated.id == req.params.id) {
    return next()
  } else {
    return next(new ForbiddenError('Owner permission denied.'))
  }
}