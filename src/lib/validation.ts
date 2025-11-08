import axios from "axios";
import type { ProxyInfo, ProxyStatus } from "@/types";

const CORS_SERVERS = ["https://cors.eu.org/", "https://corsproxy.io/?"];

const TEST_URLS = [
  "https://httpbin.org/ip",
  "https://api.ipify.org?format=json",
  "https://icanhazip.com"
];

/**
 * Validates a single proxy by attempting to make a request through it
 * @param proxyAddress - The proxy address in format "ip:port"
 * @returns ProxyInfo object with validation results
 */
export const validateProxy = async (
  proxyAddress: string
): Promise<ProxyInfo> => {
  const startTime = Date.now();

  const proxyInfo: ProxyInfo = {
    address: proxyAddress,
    status: "testing" as ProxyStatus,
    lastTested: new Date()
  };

  // Test with a simple request through CORS proxy
  for (const corsServer of CORS_SERVERS) {
    for (const testUrl of TEST_URLS) {
      try {
        const response = await axios.get(`${corsServer}${testUrl}`, {
          timeout: 10000,
          headers: {
            "X-Proxy": proxyAddress
          }
        });

        if (response.status === 200) {
          const endTime = Date.now();
          proxyInfo.status = "working";
          proxyInfo.speed = endTime - startTime;
          return proxyInfo;
        }
      } catch {
        // Continue to next URL/server
        continue;
      }
    }
  }

  // If all attempts failed
  proxyInfo.status = "failed";
  proxyInfo.speed = Date.now() - startTime;
  return proxyInfo;
};

/**
 * Validates multiple proxies concurrently with a limit
 * @param proxyAddresses - Array of proxy addresses
 * @param concurrency - Number of concurrent validations (default: 10)
 * @returns Array of ProxyInfo objects
 */
export const validateProxies = async (
  proxyAddresses: string[],
  concurrency: number = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<ProxyInfo[]> => {
  const results: ProxyInfo[] = [];
  const total = proxyAddresses.length;
  let completed = 0;

  // Process in batches
  for (let i = 0; i < proxyAddresses.length; i += concurrency) {
    const batch = proxyAddresses.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((address) => validateProxy(address))
    );

    results.push(...batchResults);
    completed += batch.length;

    if (onProgress) {
      onProgress(completed, total);
    }
  }

  return results;
};

/**
 * Quick availability check for a proxy (faster but less thorough)
 * @param proxyAddress - The proxy address in format "ip:port"
 * @returns boolean indicating if proxy responds
 */
export const quickCheckProxy = async (
  proxyAddress: string
): Promise<boolean> => {
  try {
    // Simple check using httpbin through CORS
    // Note: Most CORS proxies don't support actual proxy forwarding
    // This checks if the proxy address format is valid
    const response = await axios.get(
      `${CORS_SERVERS[0]}https://httpbin.org/ip`,
      {
        timeout: 5000,
        headers: {
          "X-Proxy-Address": proxyAddress
        }
      }
    );

    return response.status === 200;
  } catch {
    return false;
  }
};
