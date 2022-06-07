/** root_categoryid.js
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * all methods for wallet/:categoryId
 */
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// models
import { Objects, Requests } from '../../Models/index';

// utils
import middlewares from '../../utils/middlewares';

const categoryQueue = (process.env.CATEGORY_QUEUE as string) || 'categoryQueue';

const categoryIdRoutes = express.Router({ mergeParams: true });

// GET: Get the category by it's ID
categoryIdRoutes.get('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, categoryQueue, {
      status: 200,
      type: 'get-Category',
      payload: {
        _id: params.categoryId,
        user_id: req.user!._id,
      } as Objects.Category,
    });
    const response: AmqpMessage<Objects.Category> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// EDIT: Edits a category
categoryIdRoutes.patch('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, categoryQueue, {
      status: 200,
      type: 'edit-Category',
      payload: {
        _id: params.categoryId,
        archived: req.body.archived,
        icon_id: req.body.icon_id,
        parent_id: req.body.parent_id,
        name: req.body.name,
        user_id: req.body.user_id,
      } as Objects.Category,
    });
    const response: AmqpMessage<Objects.Category> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

// DELETE: Deletes a category
categoryIdRoutes.delete('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const params: any = req.params;
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, categoryQueue, {
      status: 200,
      type: 'delete-Category',
      payload: {
        _id: params.categoryId,
        user_id: req.user!._id,
      } as Objects.Wallet,
    });
    const response: AmqpMessage<Objects.Wallet> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default categoryIdRoutes;
