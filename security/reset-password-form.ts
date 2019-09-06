import * as restify from 'restify'
import * as jwt from 'jsonwebtoken'

import { NotAuthorizedError, BadRequestError } from 'restify-errors';
import { environment } from '../common/environment'

export const resetPasswordForm = (req, resp, next) => {
  const { token } = req.params

  if (token) {
    jwt.verify(token, environment.security.emailSecret, applyBearer(req, resp, next))
  } else {
    next(new NotAuthorizedError('Token and frontend link are required.'))
  }

}

function applyBearer(req: restify.Request, resp, next): (error, decoded) => void {
  return (error, decoded) => {

    if (decoded) {

      let email = decoded.sub
      let body = `
      <html>
      <body>
      <form action="http://localhost:3000/users/resetpass/${req.params.token}/${req.params.linkFront}" method="post">
        Digite sua nova senha:<br/>
        <input type="password" name="newPassword">
        <br/><br/>
        Confirme a nova senha:<br/>
        <input type="password" name="confirmNewPassword">
        <br/><br/>
        <input type="submit" value="Enviar a nova senha"> 
      </form>
      </body>
      </html>
      `
      resp.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/html'
      });
      resp.write(body);
      resp.end();

    } else {
      next(new BadRequestError('Invalid token'))
    }


  }
}
