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
import usersRoutes from './users';

// Utils
// const { checkAuth } = require("../utils/checkAuth");

const router = express.Router();

router.use('/authentication', cookieParser(), authenticationRoutes);
router.use('/users', usersRoutes);

// The rest of the Routes will return a 404 error
router.use('*', (__, res) => {
  res.status(404).send('NOT FOUND');
});

export default router;
