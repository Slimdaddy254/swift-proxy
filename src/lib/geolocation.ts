import axios from "axios";

interface GeoLocationResponse {
  country?: string;
  countryCode?: string;
  country_name?: string;
  country_code?: string;
}

const CORS_SERVERS = ["https://cors.eu.org/", "https://corsproxy.io/?"];

// Free IP geolocation APIs (no API key required)
const GEO_APIS = [
  (ip: string) => `http://ip-api.com/json/${ip}?fields=country,countryCode`,
  (ip: string) => `https://ipapi.co/${ip}/json/`,
  (ip: string) => `http://www.geoplugin.net/json.gp?ip=${ip}`
];

/**
 * Get country information for an IP address
 * @param ipAddress - The IP address to lookup
 * @returns Object with country name and code, or null if failed
 */
export const getCountryFromIP = async (
  ipAddress: string
): Promise<{ country: string; countryCode: string } | null> => {
  // Extract just the IP part if it includes port
  const ip = ipAddress.split(":")[0];

  // Validate IP format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    console.error("Invalid IP address format:", ip);
    return null;
  }

  // Try each API
  for (const apiUrlGenerator of GEO_APIS) {
    const apiUrl = apiUrlGenerator(ip);

    // Try with each CORS server
    for (const corsServer of CORS_SERVERS) {
      try {
        const response = await axios.get<GeoLocationResponse>(
          `${corsServer}${apiUrl}`,
          {
            timeout: 5000
          }
        );

        const data = response.data;

        // Handle different API response formats
        const country = data.country || data.country_name;
        const countryCode = data.countryCode || data.country_code;

        if (country && countryCode) {
          return {
            country,
            countryCode: countryCode.toUpperCase()
          };
        }
      } catch {
        // Continue to next CORS server or API
        continue;
      }
    }
  }

  return null;
};

/**
 * Get country information for multiple IP addresses
 * @param ipAddresses - Array of IP addresses (can include ports)
 * @param onProgress - Optional callback for progress updates
 * @returns Map of IP addresses to country information
 */
export const getCountriesForIPs = async (
  ipAddresses: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, { country: string; countryCode: string }>> => {
  const results = new Map<string, { country: string; countryCode: string }>();
  const total = ipAddresses.length;
  let completed = 0;

  // Process in batches of 5 to avoid rate limiting
  const batchSize = 5;

  for (let i = 0; i < ipAddresses.length; i += batchSize) {
    const batch = ipAddresses.slice(i, i + batchSize);

    const batchPromises = batch.map(async (address) => {
      const result = await getCountryFromIP(address);
      if (result) {
        results.set(address, result);
      }
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < ipAddresses.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
};

/**
 * Extract unique countries from a map of IP to country info
 * @param countryMap - Map of IP addresses to country information
 * @returns Array of unique countries with their counts
 */
export const extractCountries = (
  countryMap: Map<string, { country: string; countryCode: string }>
): Array<{ name: string; code: string; count: number }> => {
  const countryCounts = new Map<string, { name: string; count: number }>();

  countryMap.forEach((info) => {
    const existing = countryCounts.get(info.countryCode);
    if (existing) {
      existing.count++;
    } else {
      countryCounts.set(info.countryCode, {
        name: info.country,
        count: 1
      });
    }
  });

  return Array.from(countryCounts.entries())
    .map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending
};
