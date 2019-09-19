import * as restify from 'restify'
import * as jwt from 'jsonwebtoken'
import { UnauthorizedError } from 'restify-errors'
import { User } from '../resources/users/users.model'
import { environment } from '../common/environment'
import { Tenant } from '../resources/tenants/tenants.model';

export const authenticate: restify.RequestHandler = (req, resp, next) => {
  const { email, password } = req.body
  User.findByEmail(email, '+password')
    .then(user => {

      if (!user || !user.matches(password))
        return next(new UnauthorizedError('Invalid credentials'))
      
      let payload = {
        sub: user.email,
        iss: 'e-proc-api',
        tnt: user.tenant
      }
      
      const token = jwt.sign(payload, environment.security.apiSecret, { expiresIn: '8h' })
      
      Tenant.findById(user.tenant)
            .then(tenant => {

              resp.json(
                { 
                  tenant: tenant._id,
                  tenantAlias: tenant.alias,
                  _id: user._id,
                  name: user.name, 
                  email: user.email, 
                  profiles: user.profiles,
                  acceptedContract: user.acceptedContract,
                  accessToken: token                    
                })
              
              
                return next(false)

            })


    }).catch(next)
}
