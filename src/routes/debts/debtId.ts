/** root_debtId.js
 * Copyright (c) 2022. Towechlabs
 * All rights reserved
 *
 * all methods for debts/:debtid
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import { Objects, Requests } from '../../Models/index';

// utils
import middlewares from '../../utils/middlewares';

const debtQueue = (process.env.DEBT_QUEUE as string) || 'debtQueue';

const debtIdRoutes = express.Router({ mergeParams: true });

// POST: Makes a payment to the 
debtIdRoutes.post('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, debtQueue, {
      status: 200,
      type: 'debt-payment',
      payload: {
        user_id: req.user!._id,
        debt_id: params.debt_id,
        amount: req.body.amount,
        wallet_id: req.body.string,
      } as Requests.WorkerPayDebt,
    });
    const response: AmqpMessage<Objects.Debt> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});


export default debtIdRoutes;
