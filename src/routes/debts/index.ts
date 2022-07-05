/** index.js
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * index for all the debt routes
 */

// Libraries
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// Models
import { Objects, Requests } from '../../Models';

// Routes
import debtIdRoutes from './debtId';

// Utils
import middlewares from '../../utils/middlewares';

const debtQueue = (process.env.DEBT_QUEUE as string) || 'debtQueue';

const debtRoutes = express.Router();

// /:debtId Functions for specific debts
debtRoutes.use('/:debtId', debtIdRoutes);

// POST root: creates a new debt for the user
debtRoutes.post('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const newDebt = req.body as Requests.WorkerCreateDebt;

    // Passes the data to the Debt Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, debtQueue, {
      status: 200,
      type: 'add',
      payload: {
        user_id: req.user!._id,
        loaner: newDebt.loaner,
        amount: newDebt.amount,
        concept: newDebt.concept,
        date: newDebt.date,
        deduct: newDebt.deduct,
      } as Requests.WorkerCreateDebt,
    });

    // Waits for the response from the workers
    const response: AmqpMessage<Objects.Debt> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default debtRoutes;
