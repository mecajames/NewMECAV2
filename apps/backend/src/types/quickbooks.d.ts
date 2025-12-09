declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
    redirectUri: string;
  }

  interface AuthorizeUriOptions {
    scope: string[];
    state?: string;
  }

  interface TokenResponse {
    getJson(): {
      realmId: string;
      access_token: string;
      refresh_token: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      token_type: string;
    };
  }

  interface TokenData {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    realmId: string;
  }

  class OAuthClient {
    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
      Profile: string;
      Email: string;
      Phone: string;
      Address: string;
      OpenId: string;
    };

    constructor(config: OAuthClientConfig);
    authorizeUri(options: AuthorizeUriOptions): string;
    createToken(url: string): Promise<TokenResponse>;
    refresh(): Promise<TokenResponse>;
    setToken(tokenData: TokenData): void;
  }

  export default OAuthClient;
}

declare module 'node-quickbooks' {
  class QuickBooks {
    constructor(
      clientId: string | undefined,
      clientSecret: string | undefined,
      accessToken: string,
      noOAuth1: boolean,
      realmId: string,
      useSandbox: boolean,
      debug: boolean,
      minorVersion: string | null,
      oauthVersion: string,
      refreshToken: string | null,
    );

    getCompanyInfo(realmId: string, callback: (err: any, companyInfo: any) => void): void;

    findCustomers(
      criteria: { PrimaryEmailAddr?: string; fetchAll?: boolean },
      callback: (err: any, customers: any) => void,
    ): void;

    createCustomer(
      customer: { DisplayName: string; PrimaryEmailAddr?: { Address: string } },
      callback: (err: any, customer: any) => void,
    ): void;

    createSalesReceipt(
      salesReceipt: any,
      callback: (err: any, receipt: any) => void,
    ): void;

    findItems(
      criteria: { fetchAll?: boolean },
      callback: (err: any, items: any) => void,
    ): void;

    findAccounts(
      criteria: { AccountType?: string; fetchAll?: boolean },
      callback: (err: any, accounts: any) => void,
    ): void;
  }

  export default QuickBooks;
}
