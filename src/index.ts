/** App.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Main file for the WebApi, sets up the connections to amqp and http
 */

// Libraries
import express from 'express';
import morgan from 'morgan';
import logger from 'tow96-logger';
import Queue from 'tow96-amqpwrapper';

// Routes
import router from './routes';

// Main class
class WebApi {
  // Gets the variables from the .env
  private port = process.env.PORT || 3000;
  private corsOrigin = process.env.CORS_ORIGIN;

  startServer = async () => {
    // Connects to rabbitMQ
    const connection = await Queue.startConnection();
    const channel = await Queue.setUpChannelAndExchange(connection);

    // Sets up the server
    const app = express();
    app.set('port', this.port);

    // Middleware

    // use JSON bodyparser
    app.use(express.json());

    // morgan: allows the console to provide http protocol logs (only outside of production)
    if (process.env.NODE_ENV !== 'production') {
      app.use(morgan('dev'));
    }

    // CORS: enabled on the env file
    if (process.env.ENABLE_CORS === 'true') {
      app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', this.corsOrigin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        // Provide pre-flight authorization
        if ('OPTIONS' === req.method) {
          res.sendStatus(204);
        } else {
          next();
        }
      });
      logger.info('CORS enabled');
    }

    // Sets the routes, adds the rabbitMQ channel to the req so every route can use the rabbitMQ connection to publish and receive messages
    app.use(
      '/',
      (req, __, next) => {
        req.rabbitConnection = connection;
        req.rabbitChannel = channel;
        next();
      },
      router,
    );

    // Starts the server
    app.listen(app.get('port'), () => {
      logger.info(`Server running on port: ${app.get('port')}`);
    });
  };
}

const api = new WebApi();

api.startServer().catch((err: any) => {
  logger.error(err);
  logger.error('Exiting app with code 1');
  process.exit(1);
});
