import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { isAdminUser } from './auth/is-admin.helper';

// Shown to non-admins (members, public, unauthenticated) for any UNEXPECTED
// server/DB error. The specific technical reason is logged server-side and
// only ever returned to admins/staff — never leaked to regular users.
const GENERIC_ERROR_MESSAGE = 'Something went wrong on our end. Please try again, or contact support if it keeps happening.';

/**
 * Translate low-level Postgres / MikroORM constraint violations into clear,
 * safe, user-facing messages with the correct HTTP status — instead of a
 * blanket "500 Internal server error" that tells the user nothing.
 *
 * Returns null for anything that isn't a recognized DB constraint error, so
 * the caller falls back to its normal handling.
 */
function translateDbError(exception: any): { status: number; message: string } | null {
  // MikroORM wraps the driver error; the pg code/detail can live on the
  // exception itself or on its `cause`.
  const code: string | undefined = exception?.code || exception?.cause?.code;
  if (!code) return null;
  const detail: string = exception?.detail || exception?.cause?.detail || '';
  const column: string | undefined = exception?.column || exception?.cause?.column;

  const humanize = (t: string) => t.replace(/^public\./, '').replace(/_/g, ' ').trim();

  switch (code) {
    case '23503': {
      // foreign_key_violation. Two shapes:
      //  - delete blocked: "Key (id)=(..) is still referenced from table \"X\"."
      const referenced = detail.match(/still referenced from table "([^"]+)"/);
      if (referenced) {
        return {
          status: HttpStatus.CONFLICT,
          message: `Can't delete this because it still has related ${humanize(referenced[1])}. Remove or reassign those first.`,
        };
      }
      //  - insert/update points at something missing: "Key (event_id)=(..) is not present in table \"events\"."
      const missing = detail.match(/is not present in table "([^"]+)"/);
      if (missing) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `This references a ${humanize(missing[1])} record that no longer exists.`,
        };
      }
      return { status: HttpStatus.CONFLICT, message: 'This action conflicts with related records.' };
    }
    case '23505': {
      // unique_violation: "Key (col)=(val) already exists."
      const m = detail.match(/Key \(([^)]+)\)=/);
      return {
        status: HttpStatus.CONFLICT,
        message: m ? `A record with that ${humanize(m[1])} already exists.` : 'That value already exists.',
      };
    }
    case '23502': // not_null_violation
      return {
        status: HttpStatus.BAD_REQUEST,
        message: column ? `Required field "${humanize(column)}" is missing.` : 'A required field is missing.',
      };
    case '23514': // check_violation
      return { status: HttpStatus.BAD_REQUEST, message: "A value didn't pass a validation rule." };
    default:
      return null;
  }
}

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
      // Turn DB constraint violations into clear messages + the right status
      // (e.g. 409 "…still has related competition results") instead of a 500.
      const translated = translateDbError(exception);
      if (translated) status = translated.status;

      // Is the requester an admin/staff member? `request.profile` is attached
      // by ActiveMembershipGuard. ONLY admins get the specific technical
      // reason on screen — members / public / unauthenticated users get a
      // generic message so we never leak internal details to them. The real
      // reason is always logged server-side below regardless.
      const isAdminRequest = isAdminUser((request as any).profile);
      if (isAdminRequest) {
        message = translated ? translated.message : exception.message;
      } else {
        message = GENERIC_ERROR_MESSAGE;
      }

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
