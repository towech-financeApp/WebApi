/** checkAuth.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Utility that checks if the received authentication token is valid
 */

// Libraries
import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// utils
import logger from 'tow96-logger';
import { User } from '../Models';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

// Functions

// Checks if the given authorization string belongs to the superuser password
const isSuperUser = (token: string): boolean => {
  if (!process.env.SUPERUSER_KEY || token !== process.env.SUPERUSER_KEY) {
    return false;
  }
  return true;
};

// Checks if a jwt Token is valid
const isAuth = (token: string, isRefresh = false): string | Record<string, string> => {
  if (!process.env.REFRESH_TOKEN_KEY || !process.env.AUTH_TOKEN_KEY) {
    logger.error('No jwt encryption keys provided');
    throw AmqpMessage.errorMessage('No jwt encryption keys');
  }

  try {
    const decodedToken = jwt.verify(token, isRefresh ? process.env.REFRESH_TOKEN_KEY : process.env.AUTH_TOKEN_KEY);
    return decodedToken as Record<string, string>;
  } catch (err) {
    throw AmqpMessage.errorMessage('Invalid token', 401);
  }
};

// Middleware that checks if the requester is an admin
export const checkAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Gets the Authorization header
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw AmqpMessage.errorMessage('No authorization header', 401);
    }

    // Checks if the token is super user or an admin
    const token = authorization.split(' ')[1];
    if (!isSuperUser(token)) {
      // Decripts the token
      try {
        const decodedToken: any = isAuth(token);
        if (decodedToken.role !== 'admin') {
          throw AmqpMessage.errorMessage('User is not admin', 401);
        }
      } catch (err: any) {
        throw AmqpMessage.errorMessage('Invalid token', 401);
      }
    }

    next();
  } catch (err: any) {
    AmqpMessage.sendHttpError(res, err);
  }
};

// Middleware that checks if the requester is authenticated
export const checkAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) throw AmqpMessage.errorMessage('Invalid token', 403);

    // Check if the authToken is valid
    const decodedToken: any = isAuth(authorization.split(' ')[1]);

    req.user = decodedToken as User;

    next();
  } catch (err: any) {
    AmqpMessage.sendHttpError(res, err);
  }
};

// Middleware that checks if the requester has a valid refreshToken
export const checkRefresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Gets the refreshToken from the jid cookie
    const refreshToken = req.cookies.jid;
    if (!refreshToken) throw AmqpMessage.errorMessage('No refresh token', 403);

    // Validates the token
    const decodedToken = isAuth(refreshToken, true);

    // Retrieves the user from the DB to verify
    const corrId = Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'get-byId',
      payload: decodedToken,
    });
    const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);
    const user: User = response.payload;
    if (!user) throw AmqpMessage.errorMessage('Bad credentials', 422, { login: 'Bad credentials' });

    // Checks if the user has the token as still valid
    if (user.singleSessionToken !== refreshToken && !user.refreshTokens.includes(refreshToken)) {
      throw AmqpMessage.errorMessage('Invalid token', 403);
    }

    user.password = undefined;

    req.user = user;

    next();
  } catch (error) {
    res.clearCookie('jid');
    AmqpMessage.sendHttpError(res, error);
  }
};
