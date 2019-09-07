import * as restify from 'restify';

import { authorize } from '../../security/authz.handler';
import { NotFoundError } from 'restify-errors';
import { ModelRouter } from '../../common/model.router';

import { Rent } from './rents.model';


class RentsRouter extends ModelRouter<Rent> {

  constructor() {
    super(Rent)
  }

  findBySpecificTenant = (req, resp, next) => {
    let query = {
      "tenant": escape(req.query.tenant)
    }
    if (req.query.tenant) {
      Rent.find(query)
        .then(rent => {
          rent ? [rent] : []
          resp.json(rent)
        })
        .catch(next)
    } else {
      next()
    }
  }


  findAll = (req, resp, next) => {

    let query = { "tenant": req.authenticated.tenant }

    if (req.query.room) {
      Object.assign(query, { room: escape(req.query.room) })
    }

    if (req.query.date) {

      let date1 = new Date(`${req.query.date}T00:00:00.000Z`)
      let datex = new Date(`${req.query.date}T00:00:00.000Z`)
      let date2 = new Date(datex.setDate(datex.getDate() + 1))

      Object.assign(query, {
        date: {
          "$gte": date1,
          "$lt": date2
        }
      })
    }

    let profiles = req.authenticated.profiles
    let allowedRents = req.authenticated.allowedRents
    if ((profiles.indexOf('master') == -1) && (profiles.indexOf('admin') == -1)) {
      Object.assign(query, { "_id": { $in: allowedRents } })
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
    Rent.findOne(query)
      .then(obj => {
        resp.json(obj)
      })
      .catch(next)
  }


  save = (req, resp, next) => {
    req.body.tenant = req.authenticated.tenant
    req.body.user = req.authenticated._id
    let document = new Rent(req.body)
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
    Rent.update(query, req.body, options)
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
    Rent.findOneAndUpdate(query, req.body, options)
      .then(obj => resp.json(obj))
      .catch(next)
  }


  delete = (req, resp, next) => {
    let query = {
      "_id": req.params.id,
      "tenant": req.authenticated.tenant
    }
    Rent.remove(query)
      .exec()
      .then(() => {
        resp.send(204)
        return next()
      }).catch(next)
  }



  applyRoutes(application: restify.Server) {
    application.get(`${this.basePath}`, [authorize('user'), this.findBySpecificTenant, this.findAll])
    application.get(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.findById])
    application.post(`${this.basePath}`, [authorize('user'), this.save])
    application.put(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.replace])
    application.patch(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.update])
    application.del(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.delete])
  }
}

export const rentsRouter = new RentsRouter()