import * as restify from 'restify';

import { authorize } from '../../security/authz.handler';
import { NotFoundError } from 'restify-errors';
import { ModelRouter } from '../../common/model.router';

import { Room } from './rooms.model';


class RoomsRouter extends ModelRouter<Room> {

  constructor() {
    super(Room)
  }

  findBySpecificTenant = (req, resp, next) => {
    let query = {
      "tenant": escape(req.query.tenant)
    }
    if (req.query.tenant) {
      Room.find(query)
        .then(room => {
          room ? [room] : []
          resp.json(room)
        })
        .catch(next)
    } else {
      next()
    }
  }


  findAll = (req, resp, next) => {

    let query = { "tenant": req.authenticated.tenant }

    let profiles = req.authenticated.profiles
    let allowedRooms = req.authenticated.allowedRooms
    if ((profiles.indexOf('master') == -1) && (profiles.indexOf('admin') == -1)) {
      Object.assign(query, { "_id": { $in: allowedRooms } })
    }

    this.model
      .find(query)
      .sort({ name: 1 })
      .then(obj => resp.json(obj))
      .catch(next)
  }


  findById = (req, resp, next) => {
    let query = {
      "_id": req.params.id,
      "tenant": req.authenticated.tenant
    }
    Room.findOne(query)
      .then(obj => {
        resp.json(obj)
      })
      .catch(next)
  }


  save = (req, resp, next) => {
    // insere a identificação do inquilino no "body" da requisição
    req.body.tenant = req.authenticated.tenant
    // cria um novo documento com os atributos do body
    let document = new Room(req.body)
    // salva o documento no banco de dados
    document.save()
      .then(obj => resp.json(obj))
      .catch(next)
  }


  replace = (req, resp, next) => {
    let query = {
      "_id": req.params.id,
      "tenant": req.authenticated.tenant
    }
    const options = { runValidators: true, overwrite: true }
    Room.update(query, req.body, options)
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
    let query = {
      "_id": req.params.id,
      "tenant": req.authenticated.tenant
    }
    const options = { runValidators: true, new: true }
    Room.findOneAndUpdate(query, req.body, options)
      .then(obj => resp.json(obj))
      .catch(next)
  }


  delete = (req, resp, next) => {
    let query = {
      "_id": req.params.id,
      "tenant": req.authenticated.tenant
    }
    Room.remove(query)
      .exec()
      .then(() => {
        resp.send(204)
        return next()
      }).catch(next)
  }



  applyRoutes(application: restify.Server) {
    application.get(`${this.basePath}`, [authorize('user'), this.findBySpecificTenant, this.findAll])
    application.get(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.findById])
    application.post(`${this.basePath}`, [authorize('admin'), this.save])
    application.put(`${this.basePath}/:id`, [authorize('admin'), this.validateId, this.replace])
    application.patch(`${this.basePath}/:id`, [authorize('admin'), this.validateId, this.update])
    application.del(`${this.basePath}/:id`, [authorize('admin'), this.validateId, this.delete])
  }
}

export const roomsRouter = new RoomsRouter()