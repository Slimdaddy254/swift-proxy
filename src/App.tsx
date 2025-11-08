import { useState } from "react";

import Resources from "@/components/resources";
import Results from "@/components/results";
import ProxyTester from "@/components/proxy-tester";

export default function App() {
  const [results, setResults] = useState<string[]>([]);
  const [lengths, setLengths] = useState({ oldLength: 0, newLength: 0 });
  const [activeTab, setActiveTab] = useState<"scrape" | "test">("scrape");
  const [testProxies, setTestProxies] = useState<string>("");

  const handleCopyToTester = () => {
    setTestProxies(results.join("\n"));
    setActiveTab("test");
  };

  return (
    <main className="container mx-auto h-screen p-4">
      <div className="flex h-full flex-col gap-4 pb-7">
        {/* Tab Navigation */}
        <div className="flex gap-2 rounded-lg bg-gray-800 p-1">
          <button
            onClick={() => setActiveTab("scrape")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "scrape"
                ? "bg-primary text-primary-foreground"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🌐 Scrape Proxies
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "test"
                ? "bg-primary text-primary-foreground"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🧪 Test Proxies
          </button>
        </div>

        {/* Content - Using display instead of conditional rendering for better performance */}
        <div style={{ display: activeTab === "scrape" ? "contents" : "none" }}>
          <Resources setResults={setResults} setLengths={setLengths} />
          <Results
            results={results}
            lengths={lengths}
            onCopyToTester={handleCopyToTester}
          />
        </div>
        <div style={{ display: activeTab === "test" ? "contents" : "none" }}>
          <ProxyTester initialProxies={testProxies} key={testProxies} />
        </div>
      </div>
    </main>
  );
}
