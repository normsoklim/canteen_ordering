import { Request, Response } from 'express';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter<T> implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const cxt = host.switchToHttp();

    const response = cxt.getResponse<Response>();
    const request = cxt.getRequest<Request>();


    const status = exception.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract message from different types of exceptions
    let message = 'Internal Server Error';
    if (exception.message) {
      message = exception.message;
    } else if (exception.response && exception.response.message) {
      message = exception.response.message;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
