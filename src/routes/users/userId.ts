/** userId.ts
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 *
 * all methods for users/:userId
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

// Models
import { User } from '../../Models';

// utils
import { checkAuth, validateAdminOrOwner } from '../../utils/checkAuth';
import logger from 'tow96-logger';

const userIdRoutes = express.Router({ mergeParams: true });

// PATCH: / patches the user information
userIdRoutes.patch('/', checkAuth, validateAdminOrOwner, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'edit-User',
      payload: {
        _id: params.userId,
        name: req.body.name,
      } as User,
    });

    logger.http(corrId);
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default userIdRoutes;
