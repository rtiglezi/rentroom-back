import * as restify from 'restify'
import { User } from '../resources/users/users.model'
import { NotAuthorizedError, BadRequestError } from 'restify-errors';

export const changePassword: restify.RequestHandler = (req, resp, next) => {
  const { password, newPassword } = req.body

  User.findByEmail(req.authenticated.email, '+password')
    .then(user => {
      
      if (!password)
        return next(new BadRequestError('Password is required.'))

      if (!user.matches(password))
        return next(new NotAuthorizedError('Password is not correct.'))

      if (!newPassword)
        return next(new BadRequestError('New password is required.'))

      if (newPassword === password)
        return next(new BadRequestError('New password must to be different from current password.'))

      if (newPassword.length < 8)
        return next(new BadRequestError('Password must to be at least 8 characters.'))

      req.body = { password: newPassword }
      return next()

    }).catch(err => { next(err) })

}