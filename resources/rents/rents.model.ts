import { User } from './../users/users.model';
import * as mongoose from 'mongoose'
import { Tenant } from '../tenants/tenants.model';
import { Room } from '../rooms/rooms.model';

export interface Rent extends mongoose.Document {
    tenant: mongoose.Types.ObjectId | Tenant
    user: mongoose.Types.ObjectId | User
    room: mongoose.Types.ObjectId | Room
    date: Date
    value: number
    patient: string
    obs: string
}


const rentSchema = new mongoose.Schema({
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
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    value: {
        type: Number,
        required: true,
        default: 0.00
    },
    patient: {
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
rentSchema.pre('findOneAndUpdate', updateMiddleware)
rentSchema.pre('update', updateMiddleware)


export const Rent = mongoose.model<Rent>('Rent', rentSchema)