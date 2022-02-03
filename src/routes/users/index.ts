/** index.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the users routes
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// Routes
import userIdRoutes from './userId';

// utils
import middlewares from '../../utils/middlewares';
import resetRoutes from './reset';
import TokenGenerator from '../../utils/tokenGenerator';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';
const usersRoutes = express.Router();

// GET: /  Gets a list of all the users if the requester is an admin or the superuser
usersRoutes.get('/', middlewares.checkAdmin, async (req, res) => {
  try {
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'get-users',
      payload: null,
    });

    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// POST: /register  Creates a new user only admins and the superUser are allowed to create users
usersRoutes.post('/register', middlewares.checkAdmin, async (req, res) => {
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
usersRoutes.put('/password', middlewares.checkAuth, async (req, res) => {
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

// PasswordReset routes
usersRoutes.use('/reset', resetRoutes);

// GET: /email  Resends the verification email
usersRoutes.get('/email', middlewares.checkAuth, async (req, res) => {
  try {
    // Creates the token
    const token = TokenGenerator.verificationToken(req.user!._id, req.user!.username);

    // Passes the userId to the user workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'resend-emailVerify',
      payload: {
        user_id: req.user!._id,
        token: token,
      },
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// PUT: /email Changes the user's email
usersRoutes.put('/email', middlewares.checkAuth, async (req, res) => {
  const { email } = req.body;

  // Creates the token
  const token = TokenGenerator.verificationToken(req.user!._id, email);

  try {
    // Passes the data to the user workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'change-email',
      payload: {
        user_id: req.user!._id,
        email: email,
        token: token,
      },
    });

    // Waits for the response
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default usersRoutes;
