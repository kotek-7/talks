import { spawn } from 'child_process';
import { cp as copyDir, mkdir, readFile, rm, stat as statFile } from 'fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

type SlidevPackageJson = {
  name?: string;
  customFields?: {
    base?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type BuildOptions = {
  noCache: boolean;
};

async function main() {
  const args = process.argv.slice(2);
  const inputs: string[] = [];
  let noCache = false;

  for (const arg of args) {
    if (arg === '--no-cache') {
      noCache = true;
      continue;
    }
    inputs.push(arg);
  }

  if (!inputs.length) {
    console.error('Usage: tsx scripts/build.ts [--no-cache] <path-to-slide> [...more-paths]');
    process.exitCode = 1;
    return;
  }

  for (const input of inputs) {
    try {
      await handleTarget(input, { noCache });
    } catch (error) {
      process.exitCode = 1;
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
      return;
    }
  }
}

/**
 * 単一ターゲットを処理し、パッケージ情報の取得・検証と Slidev ビルドを実行する。
 * 入力: CLI で指定されたパス文字列。
 * 出力: 成功時は何も返さず、エラー時には例外を送出。
 */
async function handleTarget(input: string, options: BuildOptions) {
  const packageDir = await resolvePackageDir(input);
  const packageJsonPath = join(packageDir, 'package.json');

  const packageJson = await readSlidevPackage(packageJsonPath);
  const base = extractBase(packageJson, packageJsonPath);
  const outDir = buildOutputDir(base);

  const cacheDir = buildOutputDir(base, 'dist-stale');

  if (options.noCache) {
    console.log(
      `Building ${packageDir} with base "${base}" -> ${outDir} (no-cache: rebuild enforced)`,
    );
    await runSlidevBuild(packageDir, base, outDir);
    return;
  }

  if (await directoryExists(cacheDir)) {
    console.log(
      `Restoring ${packageDir} with base "${base}" from cache ${cacheDir} -> ${outDir}`,
    );
    await restoreFromCache(cacheDir, outDir);
    return;
  }

  console.log(
    `Cache not found for ${packageDir}. Building with base "${base}" -> ${outDir}`,
  );
  await runSlidevBuild(packageDir, base, outDir);
}

/**
 * 入力パスからパッケージディレクトリを解決し、ワークスペース内にあることを確認する。
 * 入力: 相対または絶対パス。
 * 出力: ワークスペース内のパッケージディレクトリ絶対パス。条件不一致時は例外を送出。
 */
async function resolvePackageDir(input: string) {
  const absInput = resolve(process.cwd(), input);
  const stats = await statFile(absInput).catch(() => null);

  if (!stats) {
    throw new Error(`Path not found: ${input}`);
  }

  let dir = absInput;
  if (stats.isDirectory()) {
    dir = absInput;
  } else if (stats.isFile()) {
    if (basename(absInput) !== 'package.json') {
      throw new Error(`File targets must be a package.json: ${input}`);
    }
    dir = dirname(absInput);
  } else {
    throw new Error(`Target must be a directory or package.json: ${input}`);
  }

  ensureInsideWorkspace(dir);
  return dir;
}

/**
 * 解決されたディレクトリがワークスペースルート内に収まっているか検証する。
 * 入力: 絶対パス。
 * 出力: 条件を満たさない場合に例外を送出。
 */
function ensureInsideWorkspace(targetDir: string) {
  const relativePath = relative(workspaceRoot, targetDir);
  if (relativePath === '') {
    return;
  }
  if (relativePath.startsWith('..') || relativePath.split(sep).includes('..')) {
    throw new Error(`Target directory must be inside workspace: ${targetDir}`);
  }
}

/**
 * パッケージの package.json を読み込み、オブジェクトとして返す。
 * 入力: package.json の絶対パス。
 * 出力: 解析済みの JSON オブジェクト。読み込みや解析失敗時は例外を送出。
 */
async function readSlidevPackage(packageJsonPath: string) {
  const raw = await readFile(packageJsonPath, 'utf8');
  return JSON.parse(raw) as SlidevPackageJson;
}

/**
 * package.json から customFields.base を取得して検証する。
 * 入力: package.json オブジェクトとそのパス。
 * 出力: 先頭・末尾が `/` の base 文字列。不正値は例外を送出。
 */
function extractBase(pkg: SlidevPackageJson, packageJsonPath: string) {
  const base = pkg.customFields?.base;

  if (typeof base !== 'string') {
    throw new Error(`customFields.base is missing in ${packageJsonPath}`);
  }

  if (!base.startsWith('/') || !base.endsWith('/')) {
    throw new Error(`customFields.base must start and end with "/" in ${packageJsonPath}`);
  }
  return base;
}

/**
 * base の URL セグメントを dist 系ディレクトリ配下の出力パスへ変換する。
 * 入力: `/` で囲まれた base 文字列とルートサブディレクトリ。
 * 出力: dist または dist-stale 配下の絶対パス。無効なセグメントは例外を送出。
 */
function buildOutputDir(base: string, subDir: 'dist' | 'dist-stale' = 'dist') {
  const segments = base.split('/').filter(Boolean);
  if (!segments.length) {
    throw new Error(`customFields.base must include a non-empty path segment: ${base}`);
  }

  if (segments.some(segment => segment === '.' || segment === '..')) {
    throw new Error(`customFields.base must not contain "." or ".." segments: ${base}`);
  }
  return resolve(workspaceRoot, subDir, ...segments);
}

/**
 * 指定された base と出力パスで Slidev の build コマンドを実行する。
 * 入力: 実行ディレクトリ、base 文字列、出力先ディレクトリ。
 * 出力: 成功で解決する Promise。失敗時は例外を送出。
 */
async function runSlidevBuild(cwd: string, base: string, outDir: string) {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('npx', ['slidev', 'build', '--base', base, '--out', outDir], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('error', rejectPromise);
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`slidev build failed with exit code ${code ?? 'null'}`));
      }
    });
  });
}

/**
 * キャッシュディレクトリから dist へ内容を再配置する。
 * 入力: キャッシュ元ディレクトリと出力先ディレクトリ。
 * 出力: 成功で解決する Promise。失敗時は例外を送出。
 */
async function restoreFromCache(cacheDir: string, outDir: string) {
  await mkdir(dirname(outDir), { recursive: true });
  await rm(outDir, { recursive: true, force: true });
  await copyDir(cacheDir, outDir, { recursive: true });
}

/**
 * 指定ディレクトリが存在するか判定する。
 * 入力: 絶対パス。
 * 出力: ディレクトリが存在すれば true。
 */
async function directoryExists(path: string) {
  const stats = await statFile(path).catch(() => null);
  return Boolean(stats && stats.isDirectory());
}

await main();
