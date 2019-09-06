import * as restify from 'restify'
import {EventEmitter} from 'events'

export abstract class Router extends EventEmitter {
  abstract applyRoutes(application: restify.Server)

}
