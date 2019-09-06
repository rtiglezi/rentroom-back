import * as restify from 'restify'
import { Tenant } from './tenants.model'
import { authorize } from '../../security/authz.handler';
import { NotFoundError, UnauthorizedError, MethodNotAllowedError } from 'restify-errors'
import { ModelRouter } from '../../common/model.router'
import { User } from '../users/users.model';

import * as mongoose from 'mongoose'

class TenantsRouter extends ModelRouter<Tenant> {

    constructor() {
        super(Tenant)
    }


    validateId = (req, resp, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            next(new NotFoundError('Invalid Id.'))
        } else {
            this.model.findById(req.params.id).then(obj => {
                if (obj) {
                    next()
                } else {
                    next(new NotFoundError('Document not found.'))
                }
            })
        }
    }

    findAll = (req, resp, next) => {

        /* se o solicitante não tiver o perfil MASTER,
           então filtrar pelo inquilino ao qual ele pertence */
        let query = {}
        if (req.authenticated.profiles.indexOf('master') == -1) {
            Object.assign(query, { "_id": req.authenticated.tenant })
        }

        Tenant
            .find(query)
            .sort({ name: 1 })
            .then(obj => resp.json(obj))
            .catch(next)
    }


    findById = (req, resp, next) => {

        /* se o usuário que fez a requisição não for do tipo MASTER
           e não pertencer ao inquilino buscado, negar o acesso.
           */
        if (req.authenticated.profiles.indexOf('master') == -1) {
            if (req.params.id != req.authenticated.tenant) {
                return next(new UnauthorizedError('Access denied to this tenant.'))
            }
        }

        Tenant
            .findById(req.params.id)
            .then(obj => {
                resp.json(obj)
            })
            .catch(next)
    }

    save = (req, resp, next) => {
        // cria um novo documento com os atributos do body
        let document = new Tenant(req.body)
        // salva o documento no banco de dados
        document.save()
            .then(obj => resp.json(obj))
            .catch(next)
    }

    replace = (req, resp, next) => {
        const options = { runValidators: true, overwrite: true }
        Tenant.update({ _id: req.params.id }, req.body, options)
            .exec().then(result => {
                if (result.n) {
                    return Tenant.findById(req.params.id).exec()
                } else {
                    throw new NotFoundError('Document not found.')
                }
            }).then(obj => resp.json(obj))
            .catch(next)
    }

    update = (req, resp, next) => {
        const options = { runValidators: true, new: true }
        Tenant.findByIdAndUpdate(req.params.id, req.body, options)
            .then(obj => resp.json(obj))
            .catch(next)
    }

    delete = (req, resp, next) => {
        Tenant.remove({ _id: req.params.id })
            .exec()
            .then(() => {
                resp.send(204)
                return next()
            }).catch(next)
    }


    checkFKs(req, resp, next) {
        User.find({ "tenant": req.params.id })
            .then(user => {
                if (user.length > 0) {
                    return next(new MethodNotAllowedError(`There is/are ${user.length} user(s) belonging to this tenant.`))
                } else {
                    return next()
                }
            })
    }


    applyRoutes(application: restify.Server) {
        application.get(`/tenants`, [authorize('master', 'admin'), this.findAll])
        application.get(`/tenants/:id`, [authorize('master', 'admin', 'user'), this.validateId, this.findById])
        application.post(`/tenants`, [authorize('master'), this.save])
        application.put(`/tenants/:id`, [authorize('master'), this.validateId, this.replace])
        application.patch(`/tenants/:id`, [authorize('master'), this.validateId, this.update])
        application.del(`/tenants/:id`, [authorize('master'), this.validateId, this.checkFKs, this.delete])
    }
}

export const tenantsRouter = new TenantsRouter()