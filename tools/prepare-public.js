const fs = require("fs/promises");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");

async function copyFile(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function main() {
  await copyFile(path.join(rootDir, "index.html"), path.join(publicDir, "index.html"));
  await copyFile(path.join(rootDir, "admin.html"), path.join(publicDir, "admin.html"));
  await copyDir(path.join(rootDir, "src"), path.join(publicDir, "src"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
