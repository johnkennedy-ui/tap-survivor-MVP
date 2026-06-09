import { request } from "node:https";

const owner = process.env.GITHUB_OWNER || "johnkennedy-ui";
const repo = process.env.GITHUB_REPO || "tap-survivor-MVP";
const pagesUrl = process.env.PAGES_URL || `https://${owner}.github.io/${repo}/`;

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

const runs = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`);
const pages = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/pages`);
const site = await head(pagesUrl);

console.log("# Tap Survivor Deploy Check");
console.log(`Repo: ${owner}/${repo}`);
console.log(`Pages URL: ${pagesUrl}`);

if (runs.status === 200 && runs.data.workflow_runs?.length) {
  const latest = runs.data.workflow_runs[0];
  console.log(`Latest workflow: ${latest.name}`);
  console.log(`Workflow status: ${latest.status}`);
  console.log(`Workflow conclusion: ${latest.conclusion || "pending"}`);
  console.log(`Workflow commit: ${latest.head_sha}`);
  console.log(`Workflow link: ${latest.html_url}`);
} else {
  console.log(`Latest workflow: unavailable (HTTP ${runs.status})`);
}

if (pages.status === 200) {
  console.log(`Pages configured: yes`);
  console.log(`Pages status: ${pages.data.status || "unknown"}`);
} else {
  console.log(`Pages configured: no or not publicly visible (HTTP ${pages.status})`);
}

console.log(`Pages URL HTTP status: ${site.status}${site.error ? ` (${site.error})` : ""}`);

if (site.status !== 200) {
  process.exitCode = 1;
}
