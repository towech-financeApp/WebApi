/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the users routes
 */
import express from 'express';

// utils
import Queue from 'tow96-amqpwrapper';
import { checkAdmin } from '../../utils/checkAuth';

const usersRoutes = express.Router();

// register: creates a new user only admins and the superUser are allowed to create users
usersRoutes.post('/register', checkAdmin, async (req, res) => {
  const corrId = await Queue.publishWithReply(req.rabbitChannel!, process.env.USER_QUEUE as string, {
    status: 200,
    type: 'register',
    payload: req.body,
  });

  const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

  res.status(response.status).send(response.payload);
});

export default usersRoutes;
