import { Room } from './resources/rooms/rooms.model';

import { roomsRouter } from './resources/rooms/rooms.router';
import { usersRouter } from './resources/users/users.router';

import * as jestCli from 'jest-cli'

import {Server} from './server/server'
import {environment} from './common/environment'
import {User} from './resources/users/users.model'

let server: Server
const beforeAllTests = ()=>{
  environment.db.url = process.env.DB_URL || 'mongodb://localhost/e-proc-test-db'
  environment.server.port = process.env.SERVER_PORT || 3001
  server = new Server()
  return server.bootstrap([
    usersRouter,
    roomsRouter
  ])
  .then(()=>Room.remove({}).exec())
  .then(()=>User.remove({}).exec())
  .then(()=>{
    let admin = new User()
    admin.name = 'admin'
    admin.email = 'admin@email.com'
    admin.password = '12345678'
    admin.profiles = ['admin', 'user']
    return admin.save()
  })
}

const afterAllTests = ()=>{
  return server.shutdown()
}

beforeAllTests()
.then(()=>jestCli.run())
.then(()=>afterAllTests())
.catch(console.error)
