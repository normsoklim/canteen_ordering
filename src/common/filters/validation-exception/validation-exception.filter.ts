import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse();
    
    // Handle validation errors
    if (typeof errorResponse === 'object' && errorResponse !== null) {
      const message = errorResponse['message'];
      const error = errorResponse['error'];
      
      // If message is an array (validation errors), format it nicely
      if (Array.isArray(message)) {
        const formattedErrors = message.map((error: any) => {
          if (typeof error === 'object' && error !== null) {
            return {
              field: error.property,
              errors: Object.values(error.constraints || {}).join(', '),
              value: error.value
            };
          }
          return error;
        });

        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Validation failed',
          details: formattedErrors,
        });
      } else if (typeof message === 'string' && error) {
        // Handle case where there's a general error message
        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: message,
          error: error
        });
      } else {
        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: message || exception.message,
        });
      }
    } else {
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: errorResponse || exception.message,
      });
    }
  }
}