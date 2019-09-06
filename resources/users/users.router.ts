
import * as restify from 'restify'
import { User } from './users.model'
import { ModelRouter } from '../../common/model.router'
import { authenticate } from '../../security/auth.handler'
import { authorize } from '../../security/authz.handler';
import { changePassword } from '../../security/change-password.handler';
import { forgotPassword } from '../../security/forgot-password';
import { resetPassword } from '../../security/reset-password';
import { resetPasswordForm } from '../../security/reset-password-form';
import { checkOwner } from '../../security/check-owner.handler';


import { NotFoundError } from 'restify-errors'


import * as mongoose from 'mongoose'


class UsersRouter extends ModelRouter<User>  {

  constructor() {
    super(User)
  }

  validateId = (req, resp, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      next(new NotFoundError('Invalid Id.'))
    } else {
      next()

    }
  }

  findByEmail = (req, resp, next) => {
    if (req.query.email) {
      let query = { "email": req.query.email }
      let queryAnd = {}
      // se o usuário autenticado for do tipo MASTER...
      if (req.authenticated.profiles.indexOf('master') !== -1) {
        // listar todos os usuários de nível inferior
        Object.assign(query, { "profiles": { $nin: ["master"] } })
      } else {
        /* caso contrário (será do tipo ADMIN), listar somente os 
           usuários pertencentes ao mesmo inquilino, e somente os 
           que são de nível inferior */
        Object.assign(query, { "tenant": req.authenticated.tenant })
        Object.assign(queryAnd, { "profiles": { $nin: ["admin", "master"] } })
      }
      User.find({ $and: [query, queryAnd] })
        .then(user => {
          user ? [user] : []
          resp.json(user)
        })
        .catch(next)
    } else {
      next()
    }
  }

  findAllForAssign = (req, resp, next) => {
    /* se o solicitante não tiver o perfil MASTER,
          então filtrar pelo inquilino ao qual ele pertence */
    let query = {
      "tenant": req.authenticated.tenant
    }
    User.find(query)
      .sort({ name: 1 })
      .then(users => {
        resp.json(users)
      }).catch(next)
  }



  findAll = (req, resp, next) => {
    /* se o solicitante não tiver o perfil MASTER,
          então filtrar pelo inquilino ao qual ele pertence */
    let query = {}
    let queryAnd = {}
    // se o usuário autenticado for do tipo MASTER...
    if (req.authenticated.profiles.indexOf('master') !== -1) {
      // listar todos os usuários de nível inferior
      Object.assign(query, { "profiles": { $nin: ["master"] } })
    } else {
      /* caso contrário (será do tipo ADMIN), listar somente os 
         usuários pertencentes ao mesmo inquilino, e somente os 
         que são de nível inferior */
      Object.assign(query, { "tenant": req.authenticated.tenant })
      Object.assign(queryAnd, { "profiles": { $nin: ["admin", "master"] } })
    }
    User.aggregate([
      {
        $match: { $and: [query, queryAnd] }
      },
      {
        $lookup:
        {
          from: "rooms",
          localField: "allowedRooms",
          foreignField: "_id",
          as: "allowedRoomsDetails"
        }
      },
      {
        $lookup:
        {
          from: "tenants",
          localField: "tenant",
          foreignField: "_id",
          as: "tenantDetails"
        }
      },
      {
        $project: {
          password: 0
        }
      }
    ])
      .sort({ name: 1 })
      .then(users => {
        resp.json(users)
      }).catch(next)
  }



  findById = (req, resp, next) => {
    /* se o solicitante não tiver o perfil MASTER,
         então filtrar pelo inquilino ao qual ele pertence */
    let query = {
      "_id": req.params.id
    }
    let queryAnd = {}
    // se o usuário autenticado for do tipo MASTER...
    if (req.authenticated.profiles.indexOf('master') !== -1) {
      // listar todos os usuários de nível inferior
      Object.assign(query, { "profiles": { $nin: ["master"] } })
    } else {
      /* caso contrário (será do tipo ADMIN), listar somente os 
         usuários pertencentes ao mesmo inquilino, e somente os 
         que são de nível inferior */
      Object.assign(query, { "tenant": req.authenticated.tenant })
      Object.assign(queryAnd, { "profiles": { $nin: ["admin", "master"] } })
    }
    User.findOne({ $and: [query, queryAnd] })
      .then(obj => {
        resp.json(obj)
      })
      .catch(next)
  }



  save = (req, resp, next) => {
    function profilesFilter(arrOrig, arrayBlock) {
      return arrOrig.filter(function (element) {
        return arrayBlock.indexOf(element) == -1;
      });
    }
    if (req.authenticated.profiles.indexOf('master') == -1) {
      req.body.tenant = req.authenticated.tenant
      let profiles = req.body.profiles
      req.body.profiles = profilesFilter(profiles, ['admin', 'master'])
    } else {
      let profiles = req.body.profiles
      req.body.profiles = profilesFilter(profiles, ['master'])
    }
    // cria um novo documento com os atributos do body
    let document = new User(req.body)
    // salva o documento no banco de dados
    document.save()
      .then(obj => resp.json(obj))
      .catch(next)
  }



  replace = (req, resp, next) => {
    function profilesFilter(arrOrig, arrayBlock) {
      return arrOrig.filter(function (element) {
        return arrayBlock.indexOf(element) == -1;
      });
    }
    if (req.authenticated.profiles.indexOf('master') == -1) {
      req.body.tenant = req.authenticated.tenant
      let profiles = req.body.profiles
      req.body.profiles = profilesFilter(profiles, ['admin', 'master'])
    } else {
      let profiles = req.body.profiles
      req.body.profiles = profilesFilter(profiles, ['master'])
    }
    /* se o solicitante não tiver o perfil MASTER,
        então filtrar pelo inquilino ao qual ele pertence */
    let query = {
      "_id": req.params.id
    }
    let queryAnd = {}
    // se o usuário autenticado for do tipo MASTER...
    if (req.authenticated.profiles.indexOf('master') !== -1) {
      // listar todos os usuários de nível inferior
      Object.assign(query, { "profiles": { $nin: ["master"] } })
    } else {
      /* caso contrário (será do tipo ADMIN), listar somente os 
         usuários pertencentes ao mesmo inquilino, e somente os 
         que são de nível inferior */
      Object.assign(query, { "tenant": req.authenticated.tenant })
      Object.assign(queryAnd, { "profiles": { $nin: ["admin", "master"] } })
    }
    const options = { runValidators: true, overwrite: true }
    User.update({ $and: [query, queryAnd] }, req.body, options)
      .exec().then(result => {
        if (result.n) {
          return this.model.findById(req.params.id).exec()
        } else {
          throw new NotFoundError('Document not found.')
        }
      }).then(obj => resp.json(obj))
      .catch(next)
  }



  update = (req, resp, next) => {
    function profilesFilter(arrOrig, arrayBlock) {
      return arrOrig.filter(function (element) {
        return arrayBlock.indexOf(element) == -1;
      });
    }
    if (req.authenticated.profiles.indexOf('master') == -1) {
      req.body.tenant = req.authenticated.tenant
      let profiles = req.body.profiles
      req.body.profiles = profilesFilter(profiles, ['admin', 'master'])
    } else {
      let profiles = req.body.profiles
      req.body.profiles = profilesFilter(profiles, ['master'])
    }
    /* se o solicitante não tiver o perfil MASTER,
         então filtrar pelo inquilino ao qual ele pertence */
    let query = {
      "_id": req.params.id
    }
    let queryAnd = {}
    // se o usuário autenticado for do tipo MASTER...
    if (req.authenticated.profiles.indexOf('master') !== -1) {
      // listar todos os usuários de nível inferior
      Object.assign(query, { "profiles": { $nin: ["master"] } })
    } else {
      /* caso contrário (será do tipo ADMIN), listar somente os 
         usuários pertencentes ao mesmo inquilino, e somente os 
         que são de nível inferior */
      Object.assign(query, { "tenant": req.authenticated.tenant })
      Object.assign(queryAnd, { "profiles": { $nin: ["admin", "master"] } })
    }
    const options = { runValidators: true, new: true }
    User.findOneAndUpdate({ $and: [query, queryAnd] }, req.body, options)
      .then(obj => resp.json(obj))
      .catch(next)
  }


  delete = (req, resp, next) => {
    /* se o solicitante não tiver o perfil MASTER,
        então filtrar pelo inquilino ao qual ele pertence */
    let query = {
      "_id": req.params.id
    }
    let queryAnd = {}
    // se o usuário autenticado for do tipo MASTER...
    if (req.authenticated.profiles.indexOf('master') !== -1) {
      // listar todos os usuários de nível inferior
      Object.assign(query, { "profiles": { $nin: ["master"] } })
    } else {
      /* caso contrário (será do tipo ADMIN), listar somente os 
         usuários pertencentes ao mesmo inquilino, e somente os 
         que são de nível inferior */
      Object.assign(query, { "tenant": req.authenticated.tenant })
      Object.assign(queryAnd, { "profiles": { $nin: ["admin", "master"] } })
    }
    User.remove({ $and: [query, queryAnd] })
      .exec()
      .then(() => {
        resp.send(204)
        return next()
      }).catch(next)
  }




  applyRoutes(application: restify.Server) {

    // rotas para o CRUD de usuarios

    application.get(`${this.basePath}/assign`, [authorize('user'), this.findAllForAssign])

    application.get(`${this.basePath}`, [authorize('admin', 'master'), this.findByEmail, this.findAll])
    application.get(`${this.basePath}/:id`, [authorize('admin', 'master'), this.validateId, this.findById])
    application.post(`${this.basePath}`, [authorize('admin', 'master'), this.save])
    application.put(`${this.basePath}/:id`, [authorize('admin', 'master'), this.validateId, this.replace])
    application.patch(`${this.basePath}/:id`, [authorize('admin', 'master'), this.validateId, this.update])
    application.del(`${this.basePath}/:id`, [authorize('admin', 'master'), this.validateId, this.delete])

    // rotas para controle de acesso
    application.post(`${this.basePath}/authenticate`, authenticate)

    application.patch(`${this.basePath}/:id/changepass`, [authorize('user'),
    this.validateId,
      checkOwner,
      changePassword,
    this.update])


    application.get(`${this.basePath}/forgotpass/:email/:linkFront`, forgotPassword)
    application.get(`${this.basePath}/resetpass/form/:token/:linkFront`, resetPasswordForm)
    application.post(`${this.basePath}/resetpass/:token/:linkFront`, resetPassword)


  }

}

export const usersRouter = new UsersRouter()