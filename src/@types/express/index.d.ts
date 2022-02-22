import amqplib from 'amqplib';
import Models from '../../Models';

declare global {
  declare namespace Express {
    interface Request {
      rabbitChannel?: amqplib.Channel;
      rabbitConnection?: amqplib.Connection;
      user?: Models.Objects.User.BaseUser;
    }
  }
}
