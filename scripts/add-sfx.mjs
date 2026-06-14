import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { readContent, writeContent } from "./content-tools.mjs";

const root = new URL("..", import.meta.url).pathname;
const defaultSourceId = "user_skill_sfx_20260615";
const defaultLicensePath = "assets/generated/tower/sfx/License.txt";

function usage() {
  return `Usage:
  node scripts/add-sfx.mjs weapon <weapon_id> <source.wav|mp3|ogg> [--tag sfx-20260615]

Copies the audio file into assets/generated/tower/sfx/ and updates content.assets.sfx.weapons.`;
}

function parseArgs(argv) {
  const [type, id, sourcePath, ...rest] = argv;
  const options = {
    type,
    id,
    sourcePath,
    tag: "sfx-20260615",
  };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === "--tag") options.tag = rest[++i] || options.tag;
    else if (rest[i] === "--help" || rest[i] === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${rest[i]}`);
  }
  if (options.help) return options;
  if (type !== "weapon") throw new Error("Only weapon SFX are supported right now.");
  if (!id || !sourcePath) throw new Error("Missing weapon ID or source audio path.");
  if (!existsSync(sourcePath)) throw new Error(`Source audio not found: ${sourcePath}`);
  return options;
}

function addSfx({ type, id, sourcePath, tag }) {
  const content = readContent();
  if (type === "weapon" && !content.weapons?.[id]) throw new Error(`Unknown weapon: ${id}`);
  const ext = extname(sourcePath).toLowerCase();
  if (![".wav", ".mp3", ".ogg"].includes(ext)) throw new Error(`Unsupported audio extension: ${ext}`);

  const outDir = join(root, "assets/generated/tower/sfx");
  mkdirSync(outDir, { recursive: true });
  const licenseFullPath = join(root, defaultLicensePath);
  if (!existsSync(licenseFullPath)) {
    writeFileSync(licenseFullPath, "User-provided sound effects for this project. Commercial use allowed by project owner.\n");
  }

  const filename = `${id}${ext}`;
  const relativePath = `assets/generated/tower/sfx/${filename}`;
  copyFileSync(sourcePath, join(root, relativePath));

  content.assets ||= {};
  content.assets.sources ||= [];
  if (!content.assets.sources.some((source) => source.id === defaultSourceId)) {
    content.assets.sources.push({
      id: defaultSourceId,
      name: "User Provided Skill Sound Effects",
      license: "User provided for this project",
      commercialUse: true,
      attributionRequired: false,
      url: "telegram",
      localLicense: defaultLicensePath,
    });
  }
  content.assets.sfx ||= {};
  content.assets.sfx.weapons ||= {};
  content.assets.sfx.weapons[id] = `${relativePath}?v=${tag}`;
  writeContent(content);
  return { id, source: basename(sourcePath), path: content.assets.sfx.weapons[id] };
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const result = addSfx(options);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("add-sfx.mjs")) main();

export { addSfx };
