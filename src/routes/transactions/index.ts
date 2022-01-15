/** index.ts
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * index for all the transaction routes
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import transactionIdRoutes from './transactionId';

// Utils
import middlewares from '../../utils/middlewares';

const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';

const transactionRoutes = express.Router();

// /:transactionId methods
transactionRoutes.use('/:transactionId', transactionIdRoutes);

// POST root: creates a new transaction for the soliciting user's wallet
transactionRoutes.post('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    // Passes the data to the Transaction Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'add-Transaction',
      payload: {
        user_id: req.user!._id,
        wallet_id: req.body.wallet_id,
        concept: req.body.concept,
        amount: req.body.amount,
        transactionDate: req.body.transactionDate,
      },
    });

    // Waits for the response from the workers
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default transactionRoutes;
