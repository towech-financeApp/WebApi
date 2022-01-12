/** index.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the users routes
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

// Routes
import userIdRoutes from './userId';

// utils
import { checkAdmin, checkAuth } from '../../utils/checkAuth';
import resetRoutes from './reset';

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

// /:userId methods
usersRoutes.use('/:userId', userIdRoutes);

// PUT: /password Changes the user's password
usersRoutes.put('/password', checkAuth, async (req, res) => {
  try {
    // Passes the data to the user workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'change-Password',
      payload: {
        ...req.body,
        user_id: req.user!._id,
      },
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

usersRoutes.use('/reset', resetRoutes);

export default usersRoutes;
