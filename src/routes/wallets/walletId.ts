/** root_walletid.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved
 *
 * all methods for wallet/:walletid
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';
import logger from 'tow96-logger';

// models
import { Objects, Requests } from '../../Models/index';

// utils
import middlewares from '../../utils/middlewares';

const transactionQueue = (process.env.TRANSACTION_QUEUE as string) || 'transactionQueue';

const walletIdRoutes = express.Router({ mergeParams: true });

// GET: Get the wallet by it's ID
walletIdRoutes.get('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'get-Wallet',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
      } as Objects.Wallet,
    });
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload as Objects.Wallet);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// PATCH: Change the wallet's data (except the money it holds nor it's parent/child relations)
walletIdRoutes.patch('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'edit-Wallet',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
        name: req.body.name,
        icon_id: req.icon_id,
        currency: req.currency,
      } as Objects.Wallet,
    });
    logger.http(corrId);
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload as Objects.Wallet);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// DELETE: Deletes a wallet and all its transactions
walletIdRoutes.delete('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'delete-Wallet',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
      } as Objects.Wallet,
    });
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload as Objects.Wallet);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// GET: /transactions  Gets the transactions of the wallet from a given month, if no month is given, then the current one is selected
walletIdRoutes.get('/transactions', async (req, res) => {
  try {
    // Gets the express parameters
    const params: any = req.params;

    // Gets the datamonth, the worker will interpret it
    const datamonth: string = (req.query.datamonth || '-1').toString();

    const corrId = await Queue.publishWithReply(req.rabbitChannel!, transactionQueue, {
      status: 200,
      type: 'get-Transactions',
      payload: {
        _id: params.walletId,
        user_id: req.user!._id,
        datamonth: datamonth,
      } as Requests.WorkerGetTransactions,
    });
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload.transactions as Objects.Transaction[]);
  } catch (e) {
    logger.http(e);
    AmqpMessage.sendHttpError(res, e);
  }
});

export default walletIdRoutes;
