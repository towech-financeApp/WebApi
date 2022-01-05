/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the users routes
 */
import express from 'express';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

// Models
import { User } from '../../Models';

// utils
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';
import { checkAdmin, checkAuth, validateAdminOrOwner } from '../../utils/checkAuth';
import logger from 'tow96-logger';

const usersRoutes = express.Router();

// register: creates a new user only admins and the superUser are allowed to create users
usersRoutes.post('/register', checkAdmin, async (req, res) => {
  const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
    status: 200,
    type: 'register',
    payload: req.body,
  });

  const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

  res.status(response.status).send(response.payload);
});

// user: patches the user information
usersRoutes.patch('/:userId', checkAuth, validateAdminOrOwner, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'edit-User',
      payload: {
        _id: params.userId,
        name: req.body.name,
      } as User
    });

    logger.http(corrId);
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default usersRoutes;
