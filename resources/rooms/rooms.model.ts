import * as mongoose from 'mongoose'
import { Tenant } from '../tenants/tenants.model';


export interface Room extends mongoose.Document {
    tenant: mongoose.Types.ObjectId | Tenant
    name: string,
    schedule: [{ 
        hour: string, 
        value: string,
        isActive: boolean
    }],
    isActive: boolean
}



const roomSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    schedule: {
        type: [{ 
            hour: String, 
            value: String,
            isActive: Boolean
        }]
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true
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
roomSchema.pre('findOneAndUpdate', updateMiddleware)
roomSchema.pre('update', updateMiddleware)


export const Room = mongoose.model<Room>('Room', roomSchema)