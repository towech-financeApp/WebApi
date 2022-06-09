/** userId.ts
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 *
 * all methods for users/:userId
 */

// Libraries
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// Models
import { Objects } from '../../Models';

// utils
import middlewares from '../../utils/middlewares';
import UserConverter from '../../utils/userConverter';

const categoryQueue = (process.env.CATEGORY_QUEUE as string) || 'categoryQueue';
const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';
const userQueue = (process.env.USER_QUEUE as string) || 'userQueue';

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

    const response: AmqpMessage<Objects.User.BackendUser> = await Queue.fetchFromQueue(
      req.rabbitChannel!,
      corrId,
      corrId,
    );
    const user = response.payload;

    const output = UserConverter.convertToBaseUser(user);

    res.status(response.status).send(output);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// DELETE: / removes all data
userIdRoutes.delete('/', middlewares.checkAdmin, async (req, res) => {
  try {
    const params: any = req.params;

    // First removes all wallets and transactions of the user
    Queue.publishSimple(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'delete-User',
      payload: {
        _id: params.userId,
      } as Objects.User.BaseUser,
    });

    // Then removes the custom categories of the user
    Queue.publishSimple(req.rabbitChannel!, categoryQueue, {
      status: 200,
      type: 'delete-User',
      payload: {
        _id: params.userId,
      } as Objects.User.BaseUser,
    });

    // Finally deletes the user
    Queue.publishSimple(req.rabbitChannel!, userQueue, {
      status: 200,
      type: 'delete-User',
      payload: {
        _id: params.userId,
      } as Objects.User.BaseUser,
    });

    res.sendStatus(204);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default userIdRoutes;
