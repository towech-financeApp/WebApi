/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the wallet routes
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import { Objects, Requests, Responses } from '../../Models/index';

// routes
import walletIdRoutes from './walletId';

// utils
import middlewares from '../../utils/middlewares';

const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';

const walletsRoutes = express.Router();

// /:walletId Functions for specific wallets
walletsRoutes.use('/:walletId', walletIdRoutes);

// GET root: gets all the wallets of a user
walletsRoutes.get('/', async (req, res) => {
  // Makes the call to the DB
  try {
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'get-Wallets',
      payload: { _id: req.user!._id } as Objects.User.BaseUser,
    });
    const response: AmqpMessage<Objects.Wallet[]> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    res.status(500).send(e);
  }
});

// POST root: creates a new wallet for the soliciting user
walletsRoutes.post('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    // Passes the data to the Transaction Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'add-Wallet',
      payload: {
        user_id: req.user!._id,
        name: req.body.name,
        money: req.body.money,
        currency: req.body.currency,
        parent_id: req.body.parent_id,
        icon_id: req.body.icon_id,
      } as Objects.Wallet,
    });

    // Waits for the response from the workers
    const response: AmqpMessage<Objects.Wallet> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// POST transfer: creates a pair of transactions to transfer an amount from one to another
walletsRoutes.post('/transfer', middlewares.checkConfirmed, async (req, res) => {
  try {
    // Passes the data to the Transaction Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'transfer-Wallet',
      payload: {
        user_id: req.user!._id,
        from_id: req.body.from_id,
        to_id: req.body.to_id,
        amount: req.body.amount,
        concept: req.body.concept,
        transactionDate: req.body.transactionDate,
      } as Requests.WorkerTransfer,
    });

    // Waits for the response from the workers
    const response: AmqpMessage<Responses.ChangeTransactionResponse> = await Queue.fetchFromQueue(
      req.rabbitChannel!,
      corrId,
      corrId,
    );

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default walletsRoutes;
