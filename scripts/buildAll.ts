import { readFile, glob } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

type Pkg = {
  name?: string;
  private?: boolean;
  workspaces?: string[] | { packages: string[] };
  scripts?: Record<string, string>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function readJSON<T = any>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function normalizeWorkspaces(ws: Pkg["workspaces"]): string[] {
  if (!ws) return [];
  if (Array.isArray(ws)) return ws;
  if (typeof ws === "object" && Array.isArray(ws.packages)) return ws.packages;
  return [];
}

async function findWorkspaceDirs(patterns: string[]): Promise<string[]> {
  const set = new Set<string>();
  for (const pat of patterns) {
    const pattern = pat.endsWith("/package.json") ? pat : `${pat}/package.json`;
    for await (const match of glob(pattern, { cwd: root })) {
      // match is like: packages/foo/package.json
      set.add(resolve(root, dirname(match)));
    }
  }
  return [...set];
}

async function hasScriptBuild(dir: string): Promise<boolean> {
  const pkgPath = resolve(dir, "package.json");
  try {
    const pkg = await readJSON<Pkg>(pkgPath);
    return !!pkg.scripts?.build;
  } catch {
    return false;
  }
}

async function runIn(dir: string, name: string) {
  console.log(`\n— ${name} (${dir}) : npm run build`);
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  await new Promise<void>((resolve, reject) => {
    const ps = spawn(cmd, ["run", "build"], {
      cwd: dir,
      stdio: "inherit",
    });
    ps.on("error", reject);
    ps.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script "build" failed in ${name} (exit ${code})`));
      }
    });
  });
}

async function main() {
  const rootPkg = await readJSON<Pkg>(resolve(root, "package.json"));
  const patterns = normalizeWorkspaces(rootPkg.workspaces);
  if (patterns.length === 0) {
    console.error("No workspaces defined in root package.json");
    process.exit(1);
  }

  const dirs = await findWorkspaceDirs(patterns);
  if (dirs.length === 0) {
    console.error("No workspace package.json found for given patterns");
    process.exit(1);
  }

  for (const dir of dirs) {
    const pkg = await readJSON<Pkg>(resolve(dir, "package.json"));
    const name = pkg.name ?? dir;
    if (!(await hasScriptBuild(dir))) {
      console.log(`\n— ${name} (${dir}) : skip (scripts.build not found)`);
      continue;
    }
    await runIn(dir, name);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
