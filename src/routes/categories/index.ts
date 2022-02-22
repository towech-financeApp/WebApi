/** index.js
 * Copyright (c) 2022, Towechlabs
 * All rights reserved
 *
 * index for all the category routes
 */
import express from 'express';
import Queue from 'tow96-amqpwrapper';

// Models
import { Objects, Requests, Responses } from '../../Models';

const categoryQueue = (process.env.CATEGORY_QUEUE as string) || 'categoryQueue';

const categoryRoutes = express.Router();

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
    const response = await Queue.fetchFromQueue(req.rabbitChannel!, corrId, corrId);

    // Sorts the received categories
    const incomeCats: Objects.Category[] = [];
    const expenseCats: Objects.Category[] = [];

    response.payload.map((category: Objects.Category) => {
      switch (category.type) {
        case 'Income':
          incomeCats.push(category);
          break;
        case 'Expense':
          expenseCats.push(category);
          break;
      }
    });

    res.status(response.status).send({ Income: incomeCats, Expense: expenseCats } as Responses.GetCategoriesResponse);
  } catch (e) {
    res.status(500).send(e);
  }
});

export default categoryRoutes;
