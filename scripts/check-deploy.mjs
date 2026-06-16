import { request } from "node:https";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const owner = process.env.GITHUB_OWNER || "johnkennedy-ui";
const repo = process.env.GITHUB_REPO || "tap-survivor-MVP";
const pagesUrl = process.env.PAGES_URL || `https://${owner}.github.io/${repo}/`;
const previewUrl =
  process.env.PREVIEW_URL ||
  `https://htmlpreview.github.io/?https://github.com/${owner}/${repo}/blob/main/index.html`;

function fetchJson(url) {
  return new Promise((resolve) => {
    const req = request(
      url,
      { headers: { "user-agent": "tap-survivor-mvp-deploy-check" } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      },
    );
    req.on("error", (error) => resolve({ status: 0, error: error.message }));
    req.end();
  });
}

function head(url) {
  return new Promise((resolve) => {
    const req = request(url, { method: "HEAD" }, (res) => {
      res.resume();
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on("error", (error) => resolve({ status: 0, error: error.message }));
    req.end();
  });
}

function get(url) {
  return new Promise((resolve) => {
    const req = request(url, { headers: { "user-agent": "tap-survivor-mvp-deploy-check" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", (error) => resolve({ status: 0, error: error.message, body: "" }));
    req.end();
  });
}

function localHeadSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function loadedSourceUrls(html) {
  return [...html.matchAll(/\b(?:src|href)="(src\/[^"#?]+(?:\?v=[^"#]*)?)"/g)].map((match) => match[1]);
}

function readLocalRuntimeFile(file) {
  const runtimePath = `www/${file}`;
  if (!existsSync(runtimePath)) {
    throw new Error(`Missing local runtime file: ${runtimePath}. Run npm run build:web && npm run check:runtime-parity first.`);
  }
  return readFileSync(runtimePath, "utf8");
}

const runs = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`);
const repoInfo = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`);
const pages = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/pages`);
const site = await head(pagesUrl);
const liveIndex = await get(pagesUrl);
const liveBuildInfo = await fetchJson(new URL("build-info.json", pagesUrl).href);
const liveManifest = await fetchJson(new URL("runtime-manifest.json", pagesUrl).href);
const preview = await head(previewUrl);
const localIndex = readLocalRuntimeFile("index.html");
const localBuildInfo = JSON.parse(readLocalRuntimeFile("build-info.json"));
const localManifest = JSON.parse(readLocalRuntimeFile("runtime-manifest.json"));
const localSources = loadedSourceUrls(localIndex);
const liveSources = loadedSourceUrls(liveIndex.body || "");
const sourceSha = localHeadSha();
let deployFailed = false;

console.log("# Tap Survivor Deploy Check");
console.log(`Repo: ${owner}/${repo}`);
console.log(`Local source commit: ${sourceSha || "unknown"}`);
console.log(`Pages URL: ${pagesUrl}`);
console.log(`Preview fallback URL: ${previewUrl}`);

if (runs.status === 200 && runs.data.workflow_runs?.length) {
  const sourceRun = sourceSha
    ? runs.data.workflow_runs.find((run) => run.head_sha === sourceSha && run.name === "Publish Tap Survivor MVP")
      || runs.data.workflow_runs.find((run) => run.head_sha === sourceSha && /publish|pages|deploy/i.test(run.name || ""))
      || runs.data.workflow_runs.find((run) => run.head_sha === sourceSha)
    : runs.data.workflow_runs[0];
  if (!sourceRun) {
    console.log(`Source workflow: unavailable for local commit ${sourceSha}`);
    deployFailed = true;
  } else {
    console.log(`Source workflow: ${sourceRun.name}`);
    console.log(`Workflow status: ${sourceRun.status}`);
    console.log(`Workflow conclusion: ${sourceRun.conclusion || "pending"}`);
    console.log(`Workflow commit: ${sourceRun.head_sha}`);
    console.log(`Workflow link: ${sourceRun.html_url}`);
    if (sourceRun.status !== "completed" || sourceRun.conclusion !== "success") {
      console.log("Workflow is not successfully completed yet.");
      deployFailed = true;
    }
  }
} else {
  console.log(`Source workflow: unavailable (HTTP ${runs.status})`);
}

if (repoInfo.status === 200) {
  console.log(`Repository has_pages: ${repoInfo.data.has_pages}`);
} else {
  console.log(`Repository has_pages: unavailable (HTTP ${repoInfo.status})`);
}

if (pages.status === 200) {
  console.log(`Pages configured: yes`);
  console.log(`Pages status: ${pages.data.status || "unknown"}`);
} else {
  console.log(`Pages configured: no or not publicly visible (HTTP ${pages.status})`);
}

console.log(`Pages URL HTTP status: ${site.status}${site.error ? ` (${site.error})` : ""}`);
console.log(`Pages index GET status: ${liveIndex.status}${liveIndex.error ? ` (${liveIndex.error})` : ""}`);
console.log(`Pages build-info GET status: ${liveBuildInfo.status}${liveBuildInfo.error ? ` (${liveBuildInfo.error})` : ""}`);
console.log(`Pages runtime manifest GET status: ${liveManifest.status}${liveManifest.error ? ` (${liveManifest.error})` : ""}`);
console.log(`Preview fallback HTTP status: ${preview.status}${preview.error ? ` (${preview.error})` : ""}`);

const missingSources = localSources.filter((url) => !liveSources.includes(url));
if (missingSources.length) {
  console.log("Live cache key mismatch:");
  missingSources.forEach((url) => console.log(`- missing ${url}`));
} else {
  console.log("Live cache keys: match local www/index.html");
}

if (liveBuildInfo.status === 200 && liveBuildInfo.data?.source === localBuildInfo.source && liveBuildInfo.data?.gitCommit === localBuildInfo.gitCommit) {
  console.log("Live build-info: matches local www/build-info.json");
} else {
  console.log("Live build-info mismatch");
  deployFailed = true;
}

if (liveManifest.status === 200 && liveManifest.data?.runtimeHash === localManifest.runtimeHash) {
  console.log("Live runtime manifest: matches local www/runtime-manifest.json");
} else {
  console.log("Live runtime manifest mismatch");
  deployFailed = true;
}

if (deployFailed || site.status !== 200 || liveIndex.status !== 200 || liveBuildInfo.status !== 200 || liveManifest.status !== 200 || missingSources.length) {
  process.exitCode = 1;
}
