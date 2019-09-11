import * as restify from 'restify';

import { authorize } from '../../security/authz.handler';
import { NotFoundError } from 'restify-errors';
import { ModelRouter } from '../../common/model.router';

import { Rent } from './rents.model';

import { Balance } from './../balances/balances.model';


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

    if (req.query.user) {
      Object.assign(query, { user: escape(req.query.user) })
    }

    if (req.query.dates) {

      let dts = req.query.dates
      dts = dts.split(",")

      Object.assign(query, {
        date: { $in: dts}
      })
    }

    console.log(query)

    
    let profiles = req.authenticated.profiles
    if ((profiles.indexOf('master') == -1) && (profiles.indexOf('admin') == -1)) {
      Object.assign(query, { "_id": { $in: req.authenticated._id } })
    }

    this.model
      .find(query)
      .sort({ created_at: -1 })
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
      .then(

        obj => {
          let balance = {
            tenant: obj.tenant,
            user: obj.user,
            date: new Date(),
            value: obj.value,
            transaction: 'D',
            obs: 'Débito por reserva de sala.'
          }
          let doc = new Balance(balance)
          doc.save()
            .then(
              resp.json(obj)
            )
        }
      )
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
      "tenant": req.authenticated.tenant,
      "user": req.authenticated._id
    }
    Rent.remove(query)
      .exec()
      .then(() => {
        resp.send(204)
        return next()
      }).catch(next)
  }

  chargeBackBalance(req, resp, next) {
    let query = {
      "_id": req.params.id
    }
    Rent.findOne(query)
      .then(obj => {
        let balance = {
          tenant: obj.tenant,
          user: obj.user,
          date: new Date(),
          value: obj.value,
          transaction: 'C',
          obs: 'Estorno por cancelamento de reserva de sala.'
        }
        let doc = new Balance(balance)
        doc.save()
          .then(
            next()
          )
      })
      .catch()
  }



  applyRoutes(application: restify.Server) {
    application.get(`${this.basePath}`, [authorize('user'), this.findBySpecificTenant, this.findAll])
    application.get(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.findById])
    application.post(`${this.basePath}`, [authorize('user'), this.save])
    application.put(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.replace])
    application.patch(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.update])
    application.del(`${this.basePath}/:id`, [authorize('user'), this.validateId, this.chargeBackBalance, this.delete])
  }
}

export const rentsRouter = new RentsRouter()