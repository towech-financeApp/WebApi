/** index.js
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * index for all the debt routes
 */
// TODO: Models for requeests

// Libraries
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// Models
import { Objects, Requests } from '../../Models';

// Routes

// Utils
import middlewares from '../../utils/middlewares';

const categoryQueue = (process.env.DEBT_QUEUE as string) || 'debtQueue';

const categoryRoutes = express.Router();

// POST root: creates a new debt for the user
categoryRoutes.post('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const newDebt = req.body; //as Requests.NewCategoryRequest;

    // Passes the data to the Debt Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, categoryQueue, {
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

export default categoryRoutes;
