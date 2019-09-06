import {User} from './resources/users/users.model'

declare module 'restify' {
  // exporta novamente a interface Request, adicionando a propriedade
  export interface Request {
    authenticated: User
  }
}
