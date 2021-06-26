/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the wallet routes
 */
import express from 'express';
import logger from 'tow96-logger';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import { Wallet } from '../../Models/index';

// routes
import walletIdRoutes from './walletId';

const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';

const walletsRoutes = express.Router();

// /:walletId Functions for specific wallets
walletsRoutes.use('/:walletId', walletIdRoutes);

// GET root: gets all the wallets of a user
walletsRoutes.get('/', async (req, res) => {
  // Makes the call to the DB
  const corrId = Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
    status: 200,
    type: 'get-Wallets',
    payload: { _id: req.user!._id },
  });
  const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

  res.status(response.status).send(response.payload.wallets);
});

// POST root: creates a new wallet for the soliciting user
walletsRoutes.post('/', async (req, res) => {
  try {
    // Passes the data to the Transaction Workers
    const corrId = Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'add-Wallet',
      payload: {
        user_id: req.user!._id,
        name: req.body.name,
        money: req.body.money,
      } as Wallet,
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromLocalQueue(req.rabbitChannel!, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default walletsRoutes;
