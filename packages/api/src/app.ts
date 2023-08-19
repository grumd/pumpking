import './envconfig';

import express from 'express';
import jsdocSwagger from 'express-jsdoc-swagger';
import cors from 'cors';
import logger from 'morgan';
import lusca from 'lusca';
import bodyParser from 'body-parser';
import formData from 'express-form-data';

import createDebug from 'debug';
const debug = createDebug('backend-ts:app');

import routes from './routes';
import { expressRouter } from 'trpc/router';

import { StatusError } from 'utils/errors';

import { auth } from 'middlewares/auth/auth';

/**
 * JSDoc Swagger options
 */
const options = {
  info: {
    version: '0.1.0',
    title: 'PIU-TOP TS backend',
    description: '',
  },
  security: { BasicAuth: { type: 'http', scheme: 'basic' } },
  baseDir: __dirname,
  filesPattern: './**/*.ts',
  swaggerUIPath: '/api-docs',
  exposeSwaggerUI: true,
  notRequiredAsNullable: false,
  swaggerUiOptions: {},
};

/**
 * Create Express server
 */
export const app = express();
jsdocSwagger(app)(options);
const isTest = process.env.NODE_ENV === 'test';
!isTest && app.use(logger('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(formData.parse());
// app.use(formData.stream());
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://pumpking.top',
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

app.use(auth);
app.use((req, _res, next) => {
  debug(`[${req.method}] ${req.path}`);
  next();
});

app.use('/', routes);

app.use('/trpc', expressRouter);

app.use((req, res, next) => {
  next(new StatusError(404, 'Not Found'));
});

// error handler
app.use(
  (
    err: Error | StatusError<unknown>,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof StatusError) {
      debug(err.status, err.message);
      res.status(err.status).json({
        message: err.message,
        data: err.data,
      });
    } else {
      debug(err);
      res.status(500).json({
        message: 'Internal Server Error: ' + err.message,
      });
    }
  }
);
