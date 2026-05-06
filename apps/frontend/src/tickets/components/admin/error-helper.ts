/**
 * Shared error reporter for the ticket admin UI. Replaces silent
 * console.error catches so prod failures are diagnosable: surfaces HTTP
 * status, URL, and server-provided message in one alert.
 *
 * Usage:
 *   } catch (err) {
 *     reportError(err, 'create staff');
 *   }
 */
export function reportError(err: any, action: string): void {
  // Always log full error to console for stack traces.
  console.error(`Failed to ${action}:`, err);

  const status = err?.response?.status ?? err?.status;
  const url = err?.config?.url ?? err?.request?.responseURL ?? '(unknown URL)';
  const method = (err?.config?.method ?? '').toUpperCase();
  const serverMsg =
    err?.response?.data?.message
      ?? (typeof err?.response?.data === 'string' ? err.response.data : null)
      ?? err?.message
      ?? 'Unknown error';

  const lines: string[] = [];
  lines.push(`Failed to ${action}.`);
  lines.push('');
  lines.push(`Status: ${status ?? '(no response received)'}`);
  if (method || url) lines.push(`Request: ${method} ${url}`.trim());
  lines.push(`Server says: ${serverMsg}`);

  // Hint at the most common environment-specific issues so admins can
  // immediately tell whether to escalate this as a bug or a deploy/config issue.
  if (!status) {
    lines.push('');
    lines.push('No HTTP response — likely a network/CORS issue, the backend is unreachable, or the request was blocked before it left the browser.');
  } else if (status === 401) {
    lines.push('');
    lines.push('401 Unauthorized — your session token may have expired or isn\'t reaching the backend. Try signing out and back in.');
  } else if (status === 403) {
    lines.push('');
    lines.push('403 Forbidden — backend received the request but rejected your credentials/role.');
  } else if (status === 404) {
    lines.push('');
    lines.push('404 Not Found — the API endpoint isn\'t deployed on this server, or the URL is wrong.');
  } else if (status >= 500) {
    lines.push('');
    lines.push('Server error — backend logs will have the stack trace.');
  }

  alert(lines.join('\n'));
}
