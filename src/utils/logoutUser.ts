/** logoutUser.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Utility that removes the refresh tokens from a user if a token is provided,
 * only removes it, otherwise, removes all tokens
 */
import { User } from '../Models';
import amqplib from 'amqplib';
import Queue from 'tow96-amqpwrapper';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

const logoutUser = (channel: amqplib.Channel, user: User, token: string | null = null) => {
  // If a token is provided, only that one is removed
  if (token) {
    if (user.singleSessionToken === token) user.singleSessionToken = undefined;
    user.refreshTokens = user.refreshTokens.filter((rToken) => rToken !== token);
  } else {
    user.refreshTokens = [];
    user.singleSessionToken = undefined;
  }

  // Updates de user
  Queue.publishSimple(channel, userQueue, {
    status: 200,
    type: 'log',
    payload: user,
  });
};

export default logoutUser;
