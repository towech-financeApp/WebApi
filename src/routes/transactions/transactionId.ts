/** walletid.ts
 * Copyright (c) 2020, Jose Tow
 * All rights reserved
 *
 * all methods for transactions/:transactionid
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import { Transaction } from '../../Models';

// utils
import middlewares from '../../utils/middlewares';

const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';

const transactionIdRoutes = express.Router({ mergeParams: true });

// GET: /  Returns the requested transaction
transactionIdRoutes.get('/', async (req, res) => {
  try {
    const params: any = req.params;

    // Passes the data to the Transaction Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'get-Transaction',
      payload: {
        user_id: req.user!._id,
        _id: params.transactionId,
      },
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// PATCH: / Edits the requested transaction
transactionIdRoutes.patch('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;

    // Passes the data to the Transaction Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'edit-Transaction',
      payload: {
        _id: params.transactionId,
        user_id: req.user!._id,
        wallet_id: req.body.wallet_id,
        concept: req.body.concept,
        amount: req.body.amount,
        transactionDate: req.body.transactionDate,
      } as Transaction,
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

transactionIdRoutes.delete('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;

    // Passes the data to the Transaction Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'delete-Transaction',
      payload: {
        user_id: req.user!._id,
        _id: params.transactionId,
      },
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default transactionIdRoutes;
