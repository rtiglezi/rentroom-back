import { User } from '../users/users.model';
import * as mongoose from 'mongoose'
import { Tenant } from '../tenants/tenants.model';

export interface Balance extends mongoose.Document {
    tenant: mongoose.Types.ObjectId | Tenant
    user: mongoose.Types.ObjectId | User
    date: String
    value: number
    transaction: string
    obs: string

}


const balanceSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true,
        default: 0.00
    },
    transaction: {
        type: String
    },
    obs: {
        type: String
    }
},
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }

    })


const updateMiddleware = function (next) {

    let date = new Date();
    let timestamp = date.getTime();

    this.getUpdate().updated_at = timestamp;

    next()
}


/* middleware para criptografar a senha no momento de alterar */
balanceSchema.pre('findOneAndUpdate', updateMiddleware)
balanceSchema.pre('update', updateMiddleware)


export const Balance = mongoose.model<Balance>('Balance', balanceSchema)