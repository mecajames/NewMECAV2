import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = (exceptionResponse as any).message || message;
        // Include validation errors if present
        if ((exceptionResponse as any).errors) {
          errorDetails = { errors: (exceptionResponse as any).errors };
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
        ...(exception as any).code && { code: (exception as any).code },
        ...(exception as any).detail && { detail: (exception as any).detail },
        ...(exception as any).constraint && { constraint: (exception as any).constraint },
      };
    }

    // Skip logging for expected 404s (socket.io, favicon, etc.)
    const ignoredPaths = ['/socket.io', '/favicon.ico'];
    const shouldLog = !ignoredPaths.some((path) => request.url?.startsWith(path));

    if (shouldLog) {
      console.error('=== EXCEPTION CAUGHT ===');
      console.error('Path:', request.url);
      console.error('Method:', request.method);
      console.error('Status:', status);
      console.error('Message:', message);
      console.error('Details:', JSON.stringify(errorDetails, null, 2));
      console.error('Full exception:', exception);
      console.error('========================');
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      // Always include validation errors, other details only in development
      ...(errorDetails.errors && { errors: errorDetails.errors }),
      ...(process.env.NODE_ENV === 'development' && !errorDetails.errors && Object.keys(errorDetails).length > 0 && { errorDetails }),
    });
  }
}
