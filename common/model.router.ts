
import * as mongoose from 'mongoose'
import { NotFoundError } from 'restify-errors'
import { Router } from './router';

/* A classe receberá um modelo genérico, que será enviado
   em runtime (User, Unit etc...), por isso está sendo informado
   o modelo denominado "D" */
export abstract class ModelRouter<D extends mongoose.Document> extends Router {

    basePath: string

    constructor(protected model: mongoose.Model<D>) {
        super()
        this.basePath = `/${model.collection.name}`
    }


    /* validação para identificar se o parâmetro
       passado via get corresponde a um id com 
       formato válido */
    validateId = (req, resp, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            next(new NotFoundError('Invalid Id.'))
        } else {
            this.model.findById(req.params.id).then(obj => {
                if (obj) {
                    if ((<any>obj).tenant.toString() == req.authenticated.tenant.toString()) {
                        next()
                    } else {
                        next(new NotFoundError('Tenant not found.'))
                    }
                } else {
                    next(new NotFoundError('Document not found.'))
                }
            })
        }
    }

}