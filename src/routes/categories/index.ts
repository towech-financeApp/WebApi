/** index.js
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * index for all the category routes
 */

// Libraries
import express from 'express';
import Queue, { AmqpMessage } from 'tow96-amqpwrapper';

// Models
import { Objects, Requests, Responses } from '../../Models';

// Routes
import categoryIdRoutes from './categoryId';

// Utils
import middlewares from '../../utils/middlewares';

const categoryQueue = (process.env.CATEGORY_QUEUE as string) || 'categoryQueue';

const categoryRoutes = express.Router();

// /:categoryId Functions for specific categories
categoryRoutes.use('/:categoryId', categoryIdRoutes);

// GET root: gets all the categories of a user
categoryRoutes.get('/', async (req, res) => {
  try {
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, categoryQueue, {
      status: 200,
      type: 'get-all',
      payload: {
        user_id: req.user!._id,
      } as Requests.WorkerGetAllCategories,
    });
    const response: AmqpMessage<Objects.Category[]> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    // Sorts the received categories
    const incomeCats: Objects.Category[] = [];
    const expenseCats: Objects.Category[] = [];
    const archivedCats: Objects.Category[] = [];

    response.payload.forEach((category: Objects.Category) => {
      if (category.archived) {
        archivedCats.push(category);
      } else {
        switch (category.type) {
          case 'Income':
            incomeCats.push(category);
            break;
          case 'Expense':
            expenseCats.push(category);
            break;
        }
      }
    });

    res
      .status(response.status)
      .send({ Income: incomeCats, Expense: expenseCats, Archived: archivedCats } as Responses.GetCategoriesResponse);
  } catch (e) {
    res.status(500).send(e);
  }
});

// POST root: creates a new wallet for the soliciting user
categoryRoutes.post('/', middlewares.checkConfirmed, async (req, res) => {
  try {
    const newWallet = req.body as Requests.NewCategoryRequest;

    // If the user is an admin, it allows the user to create global categories
    const userid = req.user!.role === 'admin' && newWallet.global ? '-1' : req.user!._id;

    // Passes the data to the Category Workers
    const corrId = await Queue.publishWithReply(req.rabbitChannel!, categoryQueue, {
      status: 200,
      type: 'add',
      payload: {
        icon_id: newWallet.icon_id,
        name: newWallet.name,
        parent_id: newWallet.parent_id,
        type: newWallet.type,
        user_id: userid,
      } as Objects.Category,
    });

    // Waits for the response from the workers
    const response: AmqpMessage<Objects.Category> = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    res.status(response.status).send(response.payload);
  } catch (e) {
    AmqpMessage.sendHttpError(res, e);
  }
});

export default categoryRoutes;
