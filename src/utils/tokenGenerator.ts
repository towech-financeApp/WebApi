/** generateToken.js
 * Copyright (c) 2021, Jose Tow
 * All rights reserved.
 *
 * Creates the login tokens, the token only contains the id of the user
 */
import dotenv from 'dotenv';
dotenv.config();

// Libraries
import jwt from 'jsonwebtoken';
import { User } from '../Models';

export default class TokenGenerator {
  static authToken = (user: User): string => {
    return jwt.sign(
      {
        username: user.username,
        _id: user._id,
        role: user.role,
      },
      process.env.AUTH_TOKEN_KEY as string,
      {
        expiresIn: '1m',
      },
    );
  };

  static refreshToken = (user: User, keepSession: boolean): string => {
    return jwt.sign(
      {
        _id: user._id,
      },
      process.env.REFRESH_TOKEN_KEY as string,
      {
        expiresIn: keepSession ? '30d' : '1h',
      },
    );
  };
}
