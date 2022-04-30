/** reset.ts
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * routes for password reset
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';
import jwt from 'jsonwebtoken';

// Models
import { Objects, Requests } from '../../Models';

// Utils
import TokenGenerator from '../../utils/tokenGenerator';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

const resetRoutes = express.Router();

// POST: / ; Sends the password reset mail to a given mail
resetRoutes.post('/', async (req, res) => {
  try {
    // Sends the email to the db for verification
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'get-byUsername',
      payload: {
        username: req.body.username,
      } as Requests.WorkerGetUserByUsername,
    });

    // If the user is not registered, sends a 204 code and acts as if it worked
    const response: AmqpMessage<Objects.User.BackendUser> = await Queue.fetchFromQueue(
      req.rabbitChannel!,
      corrId,
      corrId,
    );
    const db_user = response.payload;
    if (!db_user) throw AmqpMessage.errorMessage('', 204);

    // Creates the passwordResetToken this token is only valid for 24h
    const token = TokenGenerator.passwordToken(db_user._id);

    // Sends the token to the database so it can be registered and the email can be sent
    Queue.publishSimple(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'password-reset',
      payload: {
        _id: db_user._id,
        token: token,
      } as Requests.WorkerPasswordReset,
    });

    res.sendStatus(204);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// GET: /:token ; Validates a password token
resetRoutes.get('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // extracts the payload, expiration is verified later
    const payload: any = jwt.verify(token, process.env.PASSWORD_TOKEN_KEY || '', { ignoreExpiration: true });

    // Fetches the user to verify tokens
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'get-byId',
      payload: {
        _id: payload.id,
      } as Requests.WorkerGetUserById,
    });

    // If there is no user, returns an error
    const response: AmqpMessage<Objects.User.BackendUser> = await Queue.fetchFromQueue(
      req.rabbitChannel!,
      corrId,
      corrId,
    );
    if (!response.payload) throw AmqpMessage.errorMessage('Invalid user', 422);
    const db_user = response.payload;

    // Compares the resetTokens
    if (db_user.resetToken === token) {
      // If the tokens are the same, then the expiration is verified, if invalid, an error is returned and the token is removed from the db
      try {
        jwt.verify(token, process.env.PASSWORD_TOKEN_KEY || '');
        res.sendStatus(204);
      } catch (e) {
        Queue.publishSimple(req.rabbitChannel!, userQueue, {
          status: 200,
          type: 'password-reset',
          payload: {
            _id: db_user._id,
          } as Requests.WorkerPasswordReset,
        });
        throw AmqpMessage.errorMessage('Invalid token', 422);
      }
    } else {
      res.sendStatus(403);
    }
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// POST: /:token ; sets a new password if the token is valid
resetRoutes.post('/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // extracts the payload, expiration is verified later
    const payload: any = jwt.verify(token, process.env.PASSWORD_TOKEN_KEY || '', { ignoreExpiration: true });

    // Fetches the user to verify tokens
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'get-byId',
      payload: {
        _id: payload.id,
      } as Requests.WorkerGetUserById,
    });

    // If there is no user, returns an error
    const response: AmqpMessage<Objects.User.BackendUser> = await Queue.fetchFromQueue(
      req.rabbitChannel!,
      corrId,
      corrId,
    );
    if (!response.payload) throw AmqpMessage.errorMessage('Invalid user', 422);
    const db_user = response.payload;

    // Compares the resetTokens
    if (db_user.resetToken === token) {
      // If the tokens are the same, then the expiration is verified, if invalid, an error is returned and the token is removed from the db
      try {
        jwt.verify(token, process.env.PASSWORD_TOKEN_KEY || '');

        const passwordCorrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
          status: 200,
          type: 'change-Password-Force',
          payload: {
            _id: db_user._id,
            confirmPassword: req.body.confirmPassword,
            newPassword: req.body.newPassword,
            oldPassword: req.body.oldPassword,
          } as Requests.WorkerChangePassword,
        });

        // Waits for the response from the workers
        const response: AmqpMessage<null> = await Queue.fetchFromQueue(
          req.rabbitChannel!,
          passwordCorrId,
          passwordCorrId,
        );
        res.status(response.status).send(response.payload);
      } catch (e) {
        Queue.publishSimple(req.rabbitChannel!, userQueue, {
          status: 200,
          type: 'password-reset',
          payload: {
            _id: db_user._id,
          } as Requests.WorkerPasswordReset,
        });
        throw AmqpMessage.errorMessage('Invalid token', 422);
      }
    } else {
      res.sendStatus(403);
    }
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default resetRoutes;
