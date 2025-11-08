import axios from "axios";

const CORS_SERVERS = ["https://cors.eu.org/", "https://corsproxy.io/?"];

const SPEED_TEST_URL = "https://httpbin.org/get";
const SPEED_TEST_SIZE_URL = "https://httpbin.org/bytes/1024"; // 1KB test

export interface SpeedTestResult {
  address: string;
  averageSpeed: number; // in milliseconds
  downloadSpeed?: number; // in KB/s
  success: boolean;
}

/**
 * Test the speed of a single proxy
 * @param proxyAddress - The proxy address in format "ip:port"
 * @param testRounds - Number of test rounds to average (default: 3)
 * @returns SpeedTestResult object
 */
export const testProxySpeed = async (
  proxyAddress: string,
  testRounds: number = 3
): Promise<SpeedTestResult> => {
  const speeds: number[] = [];

  for (let i = 0; i < testRounds; i++) {
    const startTime = performance.now();

    for (const corsServer of CORS_SERVERS) {
      try {
        const response = await axios.get(`${corsServer}${SPEED_TEST_URL}`, {
          timeout: 10000,
          headers: {
            "X-Proxy": proxyAddress
          }
        });

        if (response.status === 200) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          speeds.push(duration);
          break; // Success, move to next round
        }
      } catch {
        // Try next CORS server
        continue;
      }
    }

    // Small delay between rounds
    if (i < testRounds - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (speeds.length === 0) {
    return {
      address: proxyAddress,
      averageSpeed: -1,
      success: false
    };
  }

  const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  return {
    address: proxyAddress,
    averageSpeed: Math.round(averageSpeed),
    success: true
  };
};

/**
 * Test download speed through a proxy
 * @param proxyAddress - The proxy address in format "ip:port"
 * @returns Download speed in KB/s, or -1 if failed
 */
export const testProxyDownloadSpeed = async (
  proxyAddress: string
): Promise<number> => {
  const startTime = performance.now();

  for (const corsServer of CORS_SERVERS) {
    try {
      const response = await axios.get(`${corsServer}${SPEED_TEST_SIZE_URL}`, {
        timeout: 10000,
        responseType: "arraybuffer",
        headers: {
          "X-Proxy": proxyAddress
        }
      });

      if (response.status === 200) {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        const sizeInKB = 1; // 1KB test file
        const speedKBps = sizeInKB / duration;

        return Math.round(speedKBps);
      }
    } catch {
      continue;
    }
  }

  return -1;
};

/**
 * Test speed for multiple proxies
 * @param proxyAddresses - Array of proxy addresses
 * @param concurrency - Number of concurrent tests (default: 5)
 * @param onProgress - Optional callback for progress updates
 * @returns Array of SpeedTestResult objects
 */
export const testMultipleProxySpeeds = async (
  proxyAddresses: string[],
  concurrency: number = 5,
  onProgress?: (
    completed: number,
    total: number,
    current?: SpeedTestResult
  ) => void
): Promise<SpeedTestResult[]> => {
  const results: SpeedTestResult[] = [];
  const total = proxyAddresses.length;
  let completed = 0;

  // Process in batches
  for (let i = 0; i < proxyAddresses.length; i += concurrency) {
    const batch = proxyAddresses.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (address) => {
        const result = await testProxySpeed(address, 2); // 2 rounds for faster testing
        completed++;

        if (onProgress) {
          onProgress(completed, total, result);
        }

        return result;
      })
    );

    results.push(...batchResults);
  }

  return results;
};

/**
 * Get speed category/label for display
 * @param speedMs - Speed in milliseconds
 * @returns Label and color class
 */
export const getSpeedCategory = (
  speedMs: number
): { label: string; className: string } => {
  if (speedMs < 0) {
    return { label: "Failed", className: "text-red-500" };
  } else if (speedMs < 200) {
    return { label: "Excellent", className: "text-green-500" };
  } else if (speedMs < 500) {
    return { label: "Good", className: "text-blue-500" };
  } else if (speedMs < 1000) {
    return { label: "Fair", className: "text-yellow-500" };
  } else {
    return { label: "Slow", className: "text-orange-500" };
  }
};
