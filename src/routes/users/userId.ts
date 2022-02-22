/** userId.ts
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 *
 * all methods for users/:userId
 */

// Libraries
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

// Models
import { Objects } from '../../Models';

// utils
import middlewares from '../../utils/middlewares';
import UserConverter from '../../utils/userConverter';

const userIdRoutes = express.Router({ mergeParams: true });

// PATCH: / patches the user information
userIdRoutes.patch('/', middlewares.checkAuth, middlewares.validateAdminOrOwner, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'edit-User',
      payload: {
        _id: params.userId,
        name: req.body.name,
      } as Objects.User.FrontendUser,
    });

    logger.http(corrId);
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);
    const user: Objects.User.BackendUser = response.payload;

    const output = UserConverter.convertToBaseUser(user);

    res.status(response.status).send(output);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default userIdRoutes;
