import { useState, useCallback, useEffect } from "react";
import type { ProxyInfo, exportType } from "@/types";
import { validateProxy } from "@/lib/validation";
import { getCountryFromIP } from "@/lib/geolocation";
import { testProxySpeed } from "@/lib/speed-test";
import dateGenerator from "@/lib/date";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  Trash2,
  Filter,
  FileTextIcon,
  FileSpreadsheetIcon,
  FileJsonIcon,
  ClipboardIcon,
  ClipboardCheckIcon,
  Copy
} from "lucide-react";

interface ProxyTesterProps {
  initialProxies?: string;
}

export default function ProxyTester({ initialProxies = "" }: ProxyTesterProps) {
  const [inputText, setInputText] = useState(initialProxies);
  const [proxies, setProxies] = useState<ProxyInfo[]>([]);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isTesting, setIsTesting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState<string | null>(null);

  // Load initial proxies when provided
  useEffect(() => {
    if (initialProxies && initialProxies.trim()) {
      setInputText(initialProxies);
    }
  }, [initialProxies]);

  // Parse proxies from input
  const handleLoadProxies = useCallback(() => {
    const lines = inputText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const newProxies: ProxyInfo[] = lines.map((address) => ({
      address,
      status: "untested"
    }));

    setProxies(newProxies);
  }, [inputText]);

  // Test a single proxy
  const testSingleProxy = useCallback(async (address: string) => {
    setProxies((prev) =>
      prev.map((p) =>
        p.address === address ? { ...p, status: "testing" as const } : p
      )
    );

    const startTime = Date.now();

    // Validate proxy
    const validationResult = await validateProxy(address);

    // Get country
    const countryInfo = await getCountryFromIP(address);

    // Get speed if working
    let speed: number | undefined;
    if (validationResult.status === "working") {
      const speedResult = await testProxySpeed(address, 1);
      speed = speedResult.success ? speedResult.averageSpeed : undefined;
    }

    const totalTime = Date.now() - startTime;

    setProxies((prev) =>
      prev.map((p) =>
        p.address === address
          ? {
              ...p,
              status: validationResult.status,
              country: countryInfo?.country,
              countryCode: countryInfo?.countryCode,
              speed: speed || totalTime,
              lastTested: new Date()
            }
          : p
      )
    );
  }, []);

  // Test all proxies
  const handleTestAll = useCallback(async () => {
    setIsTesting(true);

    // Test proxies one by one to show progress
    for (const proxy of proxies) {
      if (proxy.status === "untested" || proxy.status === "failed") {
        await testSingleProxy(proxy.address);
      }
    }

    setIsTesting(false);
  }, [proxies, testSingleProxy]);

  // Clear all proxies
  const handleClear = useCallback(() => {
    setProxies([]);
    setInputText("");
  }, []);

  // Remove single proxy
  const handleRemoveProxy = useCallback((address: string) => {
    setProxies((prev) => prev.filter((p) => p.address !== address));
  }, []);

  // Copy single proxy
  const handleCopyProxy = useCallback((address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedProxy(address);
    setTimeout(() => setCopiedProxy(null), 2000);
  }, []);

  // Get unique countries
  const availableCountries = Array.from(
    new Set(
      proxies
        .filter((p) => p.countryCode)
        .map((p) => ({ code: p.countryCode!, name: p.country! }))
    )
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter proxies
  const filteredProxies = proxies.filter((proxy) => {
    const countryMatch =
      filterCountry === "all" || proxy.countryCode === filterCountry;
    const statusMatch = filterStatus === "all" || proxy.status === filterStatus;
    return countryMatch && statusMatch;
  });

  // Export functions
  const handleExport = useCallback(
    (format: exportType): string => {
      const workingProxies = filteredProxies
        .filter((p) => p.status === "working")
        .map((p) => p.address);

      switch (format) {
        case "txt":
          return workingProxies.join("\n");
        case "csv":
          return workingProxies
            .map((result) => `"${result.replace(/"/g, '""')}"`)
            .join("\n");
        case "json":
          return JSON.stringify(workingProxies, null, 2);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    },
    [filteredProxies]
  );

  const handleSave = useCallback(
    (format: exportType) => {
      const exportedData = handleExport(format);
      const blob = new Blob([exportedData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `working-proxies-${dateGenerator()}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    },
    [handleExport]
  );

  const handleCopy = useCallback(() => {
    const workingProxies = filteredProxies
      .filter((p) => p.status === "working")
      .map((p) => p.address)
      .join("\n");

    setIsCopying(true);
    navigator.clipboard.writeText(workingProxies);
    setTimeout(() => setIsCopying(false), 2000);
  }, [filteredProxies]);

  // Get country flag emoji
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return "🌍";
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <section className="flex grow flex-col gap-4 rounded-lg bg-gray-700 p-4 shadow-md">
      <h2 className="text-xl font-bold text-white">Proxy Tester</h2>

      {/* Input Area */}
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Paste proxies here (one per line)&#10;Example:&#10;192.168.1.1:8080&#10;10.0.0.1:3128"
          className="min-h-[100px] resize-none bg-gray-800 text-white focus:ring-2 focus:ring-blue-500"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleLoadProxies}
            disabled={!inputText.trim()}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Load Proxies ({inputText.split("\n").filter((l) => l.trim()).length}
            )
          </Button>
          <Button
            onClick={handleClear}
            variant="outline"
            disabled={proxies.length === 0}
            className="text-white hover:bg-gray-600"
          >
            <Trash2 className="mr-2" size={16} />
            Clear All
          </Button>
        </div>
      </div>

      {/* Filters */}
      {proxies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={18} className="text-white" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="working">✓ Working</SelectItem>
              <SelectItem value="failed">✗ Failed</SelectItem>
              <SelectItem value="untested">○ Untested</SelectItem>
            </SelectContent>
          </Select>

          {availableCountries.length > 0 && (
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {availableCountries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {getCountryFlag(country.code)} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={handleTestAll}
            disabled={isTesting || proxies.length === 0}
            className="ml-auto bg-green-600 hover:bg-green-700"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2" size={16} />
                Test All ({filteredProxies.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Proxy List */}
      {filteredProxies.length > 0 && (
        <div className="max-h-[500px] space-y-2 overflow-y-auto rounded-md bg-gray-800 p-3">
          {filteredProxies.map((proxy) => (
            <div
              key={proxy.address}
              className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                proxy.status === "working"
                  ? "border-green-500 bg-green-900/20"
                  : proxy.status === "failed"
                    ? "border-red-500 bg-red-900/20"
                    : proxy.status === "testing"
                      ? "border-blue-500 bg-blue-900/20"
                      : "border-gray-600 bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status Icon */}
                {proxy.status === "working" && (
                  <CheckCircle2 className="text-green-500" size={20} />
                )}
                {proxy.status === "failed" && (
                  <XCircle className="text-red-500" size={20} />
                )}
                {proxy.status === "testing" && (
                  <Loader2 className="animate-spin text-blue-500" size={20} />
                )}
                {proxy.status === "untested" && (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-500" />
                )}

                {/* Proxy Address */}
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-semibold text-white">
                    {proxy.address}
                  </span>
                  {proxy.speed && (
                    <span className="text-xs text-gray-400">
                      {proxy.speed}ms
                    </span>
                  )}
                </div>

                {/* Country Flag */}
                {proxy.countryCode && (
                  <div className="flex items-center gap-1">
                    <span className="text-2xl">
                      {getCountryFlag(proxy.countryCode)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {proxy.country}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {proxy.status !== "testing" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testSingleProxy(proxy.address)}
                    disabled={isTesting}
                  >
                    Test
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyProxy(proxy.address)}
                  disabled={isTesting}
                  className="text-blue-500 hover:bg-blue-900/20"
                  title="Copy proxy address"
                >
                  {copiedProxy === proxy.address ? (
                    <ClipboardCheckIcon size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveProxy(proxy.address)}
                  disabled={isTesting}
                  className="text-red-500 hover:bg-red-900/20"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {proxies.length > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-md bg-gray-800 p-3 text-center text-sm">
          <div>
            <div className="text-gray-400">Total</div>
            <div className="text-lg font-bold text-white">{proxies.length}</div>
          </div>
          <div>
            <div className="text-gray-400">Working</div>
            <div className="text-lg font-bold text-green-500">
              {proxies.filter((p) => p.status === "working").length}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Failed</div>
            <div className="text-lg font-bold text-red-500">
              {proxies.filter((p) => p.status === "failed").length}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Untested</div>
            <div className="text-lg font-bold text-gray-400">
              {proxies.filter((p) => p.status === "untested").length}
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {proxies.filter((p) => p.status === "working").length > 0 && (
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3 md:gap-2">
          <Button
            className="flex w-full items-center justify-center transition-colors duration-200 ease-in-out"
            variant="outline"
            onClick={() => handleSave("txt")}
            title="Save as TEXT"
          >
            <FileTextIcon className="mr-2" size={18} />
            Save as TEXT
          </Button>
          <Button
            className="flex w-full items-center justify-center transition-colors duration-200 ease-in-out"
            variant="outline"
            onClick={() => handleSave("csv")}
            title="Save as CSV"
          >
            <FileSpreadsheetIcon className="mr-2" size={18} />
            Save as CSV
          </Button>
          <Button
            className="flex w-full items-center justify-center transition-colors duration-200 ease-in-out"
            variant="outline"
            onClick={() => handleSave("json")}
            title="Save as JSON"
          >
            <FileJsonIcon className="mr-2" size={18} />
            Save as JSON
          </Button>
          <Button
            className="flex w-full items-center justify-center transition-colors duration-200 ease-in-out md:col-span-3"
            variant="outline"
            onClick={handleCopy}
            title="Copy working proxies to clipboard"
          >
            {isCopying ? (
              <ClipboardCheckIcon className="mr-2" size={18} />
            ) : (
              <ClipboardIcon className="mr-2" size={18} />
            )}
            Copy Working Proxies
          </Button>
        </div>
      )}
    </section>
  );
}
