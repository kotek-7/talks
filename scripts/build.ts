import { exec } from "node:child_process";
import { join, resolve } from "node:path";

const [base, ...args] = process.argv.slice(2);

if (!base) {
  console.error("Usage: build.ts <base> [additional slidev build args]");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");

// console.log({
//   base,
//   root,
//   outDir: join(root, "dist", base),
// })

exec(`npx slidev build --base ${base} --out ${join(root, "dist", base)} ${args}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error during build: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(`Build stderr: ${stderr}`);
  }
  console.log(`Build stdout: ${stdout}`);
});
