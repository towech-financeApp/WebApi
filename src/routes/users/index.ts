/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the users routes
 */
import express from 'express';
import logger from 'tow96-logger';

// utils
import Queue from 'tow96-amqpwrapper';
import { checkAdmin } from '../../utils/checkAuth';

const usersRoutes = express.Router();

// register: creates a new user only admins and the superUser are allowed to create users
usersRoutes.post('/register', checkAdmin, async (req, res) => {
  const corrId = Queue.publishWithReply(req.rabbitChannel!, process.env.USER_QUEUE as string, {
    status: 200,
    type: 'register',
    payload: req.body,
  });

  const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

  res.status(response.status).send(response.payload);
});

export default usersRoutes;
