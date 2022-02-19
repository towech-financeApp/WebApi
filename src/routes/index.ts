/** index.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * HTTP Route index, holds all the routes
 */
import express from 'express';
import cookieParser from 'cookie-parser';

// Routes
import authenticationRoutes from './authentication';
import categoryRoutes from './categories';
import transactionRoutes from './transactions';
import usersRoutes from './users';
import walletsRoutes from './wallets';

// Utils
import middlewares from '../utils/middlewares';

const router = express.Router();

router.use('/authentication', cookieParser(), authenticationRoutes);
router.use('/categories', middlewares.checkAuth, categoryRoutes);
router.use('/transactions', middlewares.checkAuth, transactionRoutes);
router.use('/users', usersRoutes);
router.use('/wallets', middlewares.checkAuth, walletsRoutes);

// The rest of the Routes will return a 404 error
router.use('*', (__, res) => {
  res.status(404).send('NOT FOUND');
});

export default router;
