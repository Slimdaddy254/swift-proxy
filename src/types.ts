export type ProxyType = "socks4" | "socks5" | "http/s";

export type exportType = "txt" | "csv" | "json";

export type ProxyStatus = "untested" | "testing" | "working" | "failed";

export interface ProxyInfo {
  address: string;
  status: ProxyStatus;
  country?: string;
  countryCode?: string;
  speed?: number; // in milliseconds
  lastTested?: Date;
}

export interface CountryInfo {
  name: string;
  code: string;
  count: number;
}
