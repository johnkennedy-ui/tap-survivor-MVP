import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;

const sheets = [
  {
    input: "/home/logix/.openclaw/media/inbound/c36995d3-7ece-4f83-a0cb-e22cd82b509b.jpg",
    output: "assets/generated/tower/spritesheets/enemies-tower-pack.png",
    filter: "format=rgba,colorkey=0xffffff:0.16:0.05,colorkey=0xe6e6e6:0.18:0.08",
  },
  {
    input: "/home/logix/.openclaw/media/inbound/bc543960-d6bf-4e4c-a4fa-01ace5400e2f.jpg",
    output: "assets/generated/tower/spritesheets/bosses-tower-pack.png",
    filter: "format=rgba,crop=2169:723:0:0,colorkey=0xffffff:0.16:0.05,colorkey=0xe6e6e6:0.18:0.08",
  },
];

for (const sheet of sheets) {
  if (!existsSync(sheet.input)) {
    throw new Error(`Missing source sheet: ${sheet.input}`);
  }
  const outputPath = join(root, sheet.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-i", sheet.input, "-vf", sheet.filter, "-frames:v", "1", "-update", "1", outputPath],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${sheet.output}`);
  }
  console.log(`prepared ${sheet.output}`);
}
