/**
 * Minimal Office.js type declarations for error handling
 */

declare namespace Office {
  interface AsyncResult<T> {
    status: number;
    value: T;
    error?: {
      code?: number;
      message?: string;
    };
  }

  const AsyncResultStatus: {
    Succeeded: number;
    Failed: number;
  };

  const ErrorCodes: {
    PermissionDenied: number;
    InvalidApiCall: number;
    ItemNotFound: number;
    InternalError: number;
    NetworkProblem: number;
  };

  interface MailboxItem {
    itemType?: string;
    itemClass?: string;
    to?: any;
    cc?: any;
    bcc?: any;
    body?: any;
  }

  interface Context {
    platform?: string;
    host?: string;
    diagnostics?: {
      version?: string;
    };
    mailbox?: {
      item?: MailboxItem;
      diagnostics?: {
        hostVersion?: string;
      };
    };
  }

  const context: Context;
}