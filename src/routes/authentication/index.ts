/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the authetication routes
 */
import express from 'express';
import bcrypt from 'bcryptjs';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';
import jwt from 'jsonwebtoken';

// Models
import { User } from '../../Models';

// utils
import TokenGenerator from '../../utils/tokenGenerator';
import middlewares from '../../utils/middlewares';
import logoutUser from '../../utils/logoutUser';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

const authenticationRoutes = express.Router();

// POST: /login  creates a new refresh token and authtoken for the user
authenticationRoutes.post('/login', async (req, res) => {
  // Destructures the data
  const { password, keepSession } = req.body;

  try {
    // Retrieves the user from the DB
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'get-byUsername',
      payload: req.body,
    });
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);
    const user: User = response.payload;
    if (!user) throw AmqpMessage.errorMessage('Bad credentials', 422, { login: 'Bad credentials' });

    // Compares the password
    const validPassword = await bcrypt.compare(password, user.password!);
    if (!validPassword) throw AmqpMessage.errorMessage('Bad credentials', 422, { login: 'Bad credentials' });

    // Create tokens
    const authToken = TokenGenerator.authToken(user);
    const refreshToken = TokenGenerator.refreshToken(user, keepSession);

    // Adds the refreshToken to the user
    if (keepSession) {
      // Creates an empty array if there are no tokens
      if (!user.refreshTokens) {
        user.refreshTokens = [];
      }

      // removes the last used refreshToken if there are more than 5
      if (user.refreshTokens.length >= 5) {
        user.refreshTokens.shift();
      }

      // Adds the new refresh token
      user.refreshTokens.push(refreshToken);
    } else {
      user.singleSessionToken = refreshToken;
    }

    // Query the DB, doesn't wait for response
    Queue.publishSimple(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'log',
      payload: user,
    });

    if (process.env.NODE_ENV === 'development') {
      res.cookie('jid', refreshToken, { httpOnly: true });
    } else {
      res.cookie('jid', refreshToken, { httpOnly: true, domain: process.env.COOKIEDOMAIN || '' });
    }
    res.send({ token: authToken });
  } catch (error) {
    AmqpMessage.sendHttpError(res, error);
  }
});

// POST: /refresh  if a valid refreshToken is provided, creates a new authToken
authenticationRoutes.post('/refresh', middlewares.checkRefresh, async (req, res) => {
  const authToken = TokenGenerator.authToken(req.user!);

  res.send({ token: authToken });
});

// POST: /logout  if a valid refreshToken is provided, removes the refreshToken from the user
authenticationRoutes.post('/logout', middlewares.checkRefresh, async (req, res) => {
  try {
    // Logs out the refreshToken
    logoutUser(req.rabbitChannel!, req.user!, req.cookies.jid);

    res.clearCookie('jid');
    res.sendStatus(204);
  } catch (err) {
    AmqpMessage.sendHttpError(res, err);
  }
});

// POST: /logout-all  if a valid refreshToken is provided, removes all the tokens from the user
authenticationRoutes.post('/logout-all', middlewares.checkRefresh, async (req, res) => {
  try {
    // Updates the user by removing all tokens
    logoutUser(req.rabbitChannel!, req.user!);

    res.clearCookie('jid');
    res.sendStatus(204);
  } catch (err) {
    AmqpMessage.sendHttpError(res, err);
  }
});

// PATCH: /verify/:token  verifies an email
authenticationRoutes.patch('/verify/:token', async (req, res) => {
  // Gets the token
  const token = req.params.token;

  try {
    // extracts and verifies the payload
    try {
      const payload: any = jwt.verify(token, process.env.EMAILVERIFICATION_TOKEN_KEY || '');

      // Queries the DB, doesn't wait for response
      Queue.publishSimple(req.rabbitChannel!, userQueue, {
        status: 200,
        type: 'verify-client',
        payload: payload,
      });

      res.sendStatus(204);
    } catch (e) {
      throw AmqpMessage.errorMessage('Invalid token', 422);
    }
  } catch (err) {
    AmqpMessage.sendHttpError(res, err);
  }
});

export default authenticationRoutes;
