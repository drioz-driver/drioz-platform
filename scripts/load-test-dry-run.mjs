/**
 * Conservative API smoke/load sampler for a NON-PRODUCTION DRIOZ staging environment.
 * Node >=22. No third-party dependencies. Read-only GETs only.
 *
 * Usage:
 *   DRIOZ_LOAD_TEST_URL=https://YOUR-STAGING.example \
 *   DRIOZ_LOAD_TEST_ALLOW_STAGING=YES \
 *   DRIOZ_LOAD_TEST_PATH=/api/health \
 *   node scripts/load-test-dry-run.mjs
 *
 * Defaults: 2 concurrent workers x 10 requests = 20 requests total.
 * This is NOT evidence of 10 lakh-user scalability.
 */
const raw = process.env.DRIOZ_LOAD_TEST_URL;
const confirmed = process.env.DRIOZ_LOAD_TEST_ALLOW_STAGING === "YES";
if (!raw || !confirmed) {
  console.error("Set DRIOZ_LOAD_TEST_URL and DRIOZ_LOAD_TEST_ALLOW_STAGING=YES. Staging only.");
  process.exit(2);
}
let base;
try { base = new URL(raw); } catch { console.error("Invalid URL."); process.exit(2); }
const hostname = base.hostname.toLowerCase();
if (base.protocol !== "https:" || hostname === "drioz.com" || hostname === "www.drioz.com" ||
    hostname.endsWith(".drioz.com") || hostname === "localhost" || hostname === "127.0.0.1" ||
    !/(staging|preview)/i.test(hostname) || base.username || base.password ||
    /(^|[.-])prod(uction)?([.-]|$)/i.test(hostname)) {
  console.error("Refusing production/local/non-HTTPS target:", hostname);
  process.exit(2);
}
const path = process.env.DRIOZ_LOAD_TEST_PATH || "/api/health";
if (!/^\/[a-zA-Z0-9/_-]*$/.test(path) || path.includes("//") || path.includes("..")) {
  console.error("Use a safe GET path without query parameters.");
  process.exit(2);
}
const concurrency = Number(process.env.DRIOZ_LOAD_TEST_CONCURRENCY || 2);
const perWorker = Number(process.env.DRIOZ_LOAD_TEST_REQUESTS_PER_WORKER || 10);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10 ||
    !Number.isInteger(perWorker) || perWorker < 1 || perWorker > 100) {
  console.error("Limits: concurrency 1..10; requests per worker 1..100.");
  process.exit(2);
}
const url = new URL(path, base);
const results = [];
async function worker() {
  for (let i = 0; i < perWorker; i++) {
    const start = performance.now();
    try {
      const response = await fetch(url, {method:"GET", redirect:"manual", signal:AbortSignal.timeout(8000),
        headers:{"accept":"application/json", "user-agent":"DRIOZ-staging-readonly-sampler/1.0"}});
      results.push({status:response.status, ms:performance.now()-start});
    } catch(error) {
      results.push({status:"ERROR", ms:performance.now()-start, error:String(error)});
    }
  }
}
await Promise.all(Array.from({length:concurrency}, worker));
const latencies=results.map(x=>x.ms).sort((a,b)=>a-b);
const percentile=p=>latencies[Math.min(latencies.length-1,Math.ceil(p*latencies.length)-1)].toFixed(0);
const failures=results.filter(x=>x.status==="ERROR" || x.status>=400).length;
console.log(JSON.stringify({targetHost:hostname,path,total:results.length,failures,
  failureRate:(100*failures/results.length).toFixed(2)+"%",
  p50_ms:percentile(.5),p95_ms:percentile(.95),p99_ms:percentile(.99),
  httpStatusCounts:Object.fromEntries([...new Set(results.map(r=>String(r.status)))].map(k=>[k,results.filter(r=>String(r.status)===k).length]))},null,2));
if(failures) process.exitCode=1;
