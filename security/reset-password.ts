import * as restify from 'restify'
import * as jwt from 'jsonwebtoken'

import { NotAuthorizedError, BadRequestError } from 'restify-errors';
import { environment } from '../common/environment'
import { User } from '../resources/users/users.model'
import { usersRouter } from '../resources/users/users.router';

export const resetPassword = (req, resp, next) => {
  const { token, linkFront } = req.params

  if (token && linkFront) {
    jwt.verify(token, environment.security.emailSecret, applyBearer(req, resp, next))
  } else {
    next(new NotAuthorizedError('Token and frontend link are required.'))
  }

}

function applyBearer(req: restify.Request, resp, next): (error, decoded) => void {
  return (error, decoded) => {

    if (decoded) {
      User.findByEmail(decoded.sub).then(user => {
        if (user) {

          const { newPassword, confirmNewPassword } = req.body
          const linkFront = req.params.linkFront

          if (newPassword.length >= 8 && newPassword === confirmNewPassword) {
            req.body = user
            req.body.password = newPassword
            req.params = {
              id: req.body._id
            }
            usersRouter.update(req, resp, next)

            let body = `
            <html>
            <body>
            Senha alterada com sucesso.<br/>
            <a href="http://${linkFront}">Realizar o login com sua nova senha</a>
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
            let body = `
            <html>
            <body>           
            Erro ao tentar alterar a senha.
            <br/><br/>
            - a senha deve ter ao menos 8 caracteres.<br/>
            - os campos "senha" e "confirmar senha" devem ter o mesmo valor.<br/>
            <br/>
            <input type="button" onclick="window.history.back()" value="Tentar novamente">
            </body>
            </html>
            `
            resp.writeHead(400, {
              'Content-Length': Buffer.byteLength(body),
              'Content-Type': 'text/html'
            });
            resp.write(body);
            resp.end();
          }

        }
      }).catch(error)

    } else {
      next(new BadRequestError('Invalid token'))
    }


  }
}
