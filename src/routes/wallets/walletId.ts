/** root_walletid.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * all methods for wallet/:walletid
 */
import express from 'express';
import logger from 'tow96-logger';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import { Wallet } from '../../Models/index';

const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';

const walletIdRoutes = express.Router({ mergeParams: true });

// GET: Get the wallet by it's ID
walletIdRoutes.get('/', async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'get-Wallet',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
      } as Wallet,
    });
    const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// PATCH: Change the wallet's data (except the money it holds)
walletIdRoutes.patch('/', async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'edit-Wallet',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
        name: req.body.name,
      } as Wallet,
    });
    const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// DELETE: Deletes a wallet and all its transactions
walletIdRoutes.delete('/', async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'delete-Wallet',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
      } as Wallet,
    });
    const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// GET: /transactions  Gets all the transactions of the wallet
walletIdRoutes.get('/transactions', async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'get-Transactions',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
      } as Wallet,
    });
    const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default walletIdRoutes;
