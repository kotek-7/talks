import { spawn } from 'child_process';
import { readdir, readFile, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = resolve(workspaceRoot, 'packages');

type PackageInfo = {
  name: string;
  dir: string;
  hasBase: boolean;
};

type DiffResult = {
  changedFiles: readonly string[];
  deletedPackageJsons: readonly string[];
};

async function main() {
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

  const allPackages = await discoverPackages();
  const packageInfosByName = new Map(allPackages.map(pkg => [pkg.name, pkg]));

  const defaultTargets = allPackages.filter(pkg => pkg.hasBase).map(pkg => pkg.dir);
  let targets = defaultTargets;
  const distCleanups: string[] = [];

  if (isGitHubActions) {
    const diff = await collectDiff();

    if (diff) {
      const mustRebuildAll = diff.changedFiles.some(isSharedResourcePath);

      if (!mustRebuildAll) {
        const touchedPackages = new Set<string>();
        const skippedPackages = new Set<string>();
        for (const file of diff.changedFiles) {
          const pkgName = extractPackageName(file);
          if (!pkgName) {
            continue;
          }
          const info = packageInfosByName.get(pkgName);
          if (!info) {
            continue;
          }
          if (info.hasBase) {
            touchedPackages.add(pkgName);
          } else {
            skippedPackages.add(pkgName);
          }
        }

        if (touchedPackages.size > 0) {
          targets = [...touchedPackages].map(name => packageInfosByName.get(name)!.dir);
        } else {
          targets = [];
        }

        if (skippedPackages.size > 0) {
          console.log(
            `Skipped ${skippedPackages.size} package(s) without customFields.base: ${[
              ...skippedPackages,
            ].join(', ')}`,
          );
        }
      }

      const basesForDeletion = await resolveDeletedBases(diff.deletedPackageJsons);
      distCleanups.push(...basesForDeletion);
    }
  }

  if (targets.length === 0) {
    console.log('No slide packages require rebuilding. Skipping build step.');
  } else {
    console.log(`Building ${targets.length} slide package(s):`);
    for (const target of targets) {
      console.log(`  - ${relativeToWorkspace(target)}`);
    }
    await runBuildForTargets(targets);
  }

  if (distCleanups.length > 0) {
    console.log('Cleaning up dist directories for removed slides:');
    for (const distPath of distCleanups) {
      console.log(`  - ${relativeToWorkspace(distPath)}`);
      await rm(distPath, { recursive: true, force: true });
    }
  }
}

/**
 * packages 配下のスライドを列挙し、customFields.base の有無を判断する。
 * 入力: なし（ファイルシステムから package.json を読み込む）。
 * 出力: name/dir/hasBase を持つパッケージ情報の配列。
 */
async function discoverPackages(): Promise<PackageInfo[]> {
  const dirs = await readdir(packagesRoot, { withFileTypes: true }).catch(() => []);
  const packages: PackageInfo[] = [];
  for (const dirent of dirs) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const dir = join(packagesRoot, dirent.name);
    const packageJsonPath = join(dir, 'package.json');
    let hasBase = false;
    try {
      const raw = await readFile(packageJsonPath, 'utf8');
      const parsed = JSON.parse(raw) as { customFields?: { base?: unknown } };
      hasBase = typeof parsed.customFields?.base === 'string';
    } catch {
      // ignore parse errors and treat as missing base
    }
    packages.push({
      name: dirent.name,
      dir,
      hasBase,
    });
  }
  return packages;
}

/**
 * GitHub Actions の環境変数をもとに差分対象のファイル一覧を取得する。
 * 入力: BASE_SHA/HEAD_SHA/DEFAULT_BRANCH など環境変数。
 * 出力: 変更ファイルと削除された package.json のパスを含む DiffResult。取得失敗時は null。
 */
async function collectDiff(): Promise<DiffResult | null> {
  const headSha = process.env.HEAD_SHA ?? process.env.GITHUB_SHA ?? null;
  const baseSha = process.env.BASE_SHA ?? null;
  const defaultBranch = process.env.DEFAULT_BRANCH ?? 'main';

  let resolvedHead = headSha;
  let resolvedBase = baseSha;

  if (!resolvedHead) {
    resolvedHead = await runGit(['rev-parse', 'HEAD']).catch(() => null);
  }

  if (!resolvedBase || isAllZeroSha(resolvedBase)) {
    resolvedBase = await resolveDefaultBranchSha(defaultBranch);
  }

  if (!resolvedHead || !resolvedBase) {
    console.warn(
      'Unable to resolve git diff range. Falling back to rebuilding all slide packages.',
    );
    return null;
  }

  if (resolvedHead === resolvedBase) {
    console.log('Base SHA and head SHA are identical. Skipping diff-based filtering.');
    return { changedFiles: [], deletedPackageJsons: [] };
  }

  const diffArgs = ['diff', '--name-only', `${resolvedBase}...${resolvedHead}`];
  const diffOutput = await runGit(diffArgs).catch(error => {
    console.warn(`Failed to compute diff (${error instanceof Error ? error.message : error}).`);
    return null;
  });

  if (!diffOutput) {
    return null;
  }

  const changedFiles = diffOutput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const deletionArgs = [
    'diff',
    '--name-only',
    '--diff-filter=D',
    `${resolvedBase}...${resolvedHead}`,
    '--',
    'packages',
  ];
  const deletedOutput = await runGit(deletionArgs).catch(() => '');
  const deletedPackageJsons = deletedOutput
    .split('\n')
    .map(line => line.trim())
    .filter(path => path.endsWith('package.json') && extractPackageName(path));

  return {
    changedFiles,
    deletedPackageJsons,
  };
}

/**
 * 共有リソース（共通設定やスクリプト）が変更されたか判定する。
 * 入力: Git diff で得たファイルパス。
 * 出力: 全スライド再ビルドが必要なら true、そうでなければ false。
 */
function isSharedResourcePath(filePath: string) {
  if (!filePath) {
    return false;
  }
  const normalized = filePath.replaceAll('\\', '/');
  return (
    normalized.startsWith('scripts/') ||
    normalized.startsWith('dist/') ||
    normalized === 'package.json' ||
    normalized === 'bun.lock' ||
    normalized === 'tsconfig.json' ||
    normalized === 'prettier.config.js'
  );
}

/**
 * packages 配下のファイルパスからスライドディレクトリ名を抽出する。
 * 入力: ファイルパス文字列。
 * 出力: パッケージ名（ディレクトリ名）。該当しなければ null。
 */
function extractPackageName(filePath: string) {
  if (!filePath) {
    return null;
  }
  const normalized = filePath.replaceAll('\\', '/');
  const match = normalized.match(/^packages\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * git 履歴から削除されたスライドの base を取得し、対応する dist パスを決定する。
 * 入力: 削除された package.json のパス配列。
 * 出力: 削除対象の dist ディレクトリ絶対パスの配列。取得できない場合は空配列。
 */
async function resolveDeletedBases(deletedPackageJsons: readonly string[]) {
  const baseSha = process.env.BASE_SHA;
  const defaultBranch = process.env.DEFAULT_BRANCH ?? 'main';

  let referenceSha: string | null = baseSha ?? null;
  if (!referenceSha || isAllZeroSha(referenceSha)) {
    referenceSha = await resolveDefaultBranchSha(defaultBranch);
  }

  if (!referenceSha) {
    console.warn('Unable to resolve reference SHA for deleted slide cleanup.');
    return [];
  }

  const distPaths: string[] = [];

  for (const packageJsonPath of deletedPackageJsons) {
    const pkgName = extractPackageName(packageJsonPath);
    if (!pkgName) {
      continue;
    }
    const content = await runGit(['show', `${referenceSha}:${packageJsonPath}`]).catch(() => null);
    if (!content) {
      console.warn(`Could not read ${packageJsonPath} from git history; skipping cleanup.`);
      continue;
    }

    try {
      const parsed = JSON.parse(content) as { customFields?: { base?: unknown } };
      const base = parsed.customFields?.base;
      if (typeof base === 'string') {
        const distPath = buildOutputDir(base);
        distPaths.push(distPath);
      } else {
        console.warn(
          `customFields.base missing in historical package.json for ${pkgName}; skipping cleanup.`,
        );
      }
    } catch (error) {
      console.warn(`Failed to parse historical package.json for ${pkgName}: ${error}`);
    }
  }

  return distPaths;
}

/**
 * customFields.base から dist 配下の出力ディレクトリ絶対パスを構成する。
 * 入力: 先頭末尾が / の base 文字列。
 * 出力: dist 内の絶対パス。無効な base の場合は例外を投げる。
 */
function buildOutputDir(base: string) {
  const segments = base.split('/').filter(Boolean);
  if (!segments.length) {
    throw new Error(`customFields.base must include a non-empty path segment: ${base}`);
  }

  if (segments.some(segment => segment === '.' || segment === '..')) {
    throw new Error(`customFields.base must not contain "." or ".." segments: ${base}`);
  }
  return resolve(workspaceRoot, 'dist', ...segments);
}

/**
 * 指定されたスライドパッケージを順番にビルドする。
 * 入力: パッケージディレクトリ絶対パスの配列。
 * 出力: 成功時は void。ビルド失敗時は例外を投げる。
 */
async function runBuildForTargets(targets: string[]) {
  for (const target of targets) {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(
        'npx',
        ['tsx', 'scripts/build.ts', relativeToWorkspace(target)],
        {
          cwd: workspaceRoot,
          stdio: 'inherit',
          env: { ...process.env },
        },
      );

      child.on('error', rejectPromise);
      child.on('exit', code => {
        if (code === 0) {
          resolvePromise();
        } else {
          rejectPromise(new Error(`Building ${relativeToWorkspace(target)} failed with ${code}`));
        }
      });
    });
  }
}

/**
 * git コマンドを実行し、標準出力を文字列として返す。
 * 入力: git サブコマンド配列。
 * 出力: 標準出力文字列。エラー時は例外を投げる。
 */
async function runGit(args: string[]) {
  let stdout = '';
  let stderr = '';
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('git', args, {
      cwd: workspaceRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', rejectPromise);
    child.on('exit', code => {
      if (code === 0) {
        resolvePromise();
      } else {
        const message = stderr.trim() || `git ${args.join(' ')} exited with code ${code}`;
        rejectPromise(new Error(message));
      }
    });
  });
  return stdout.trim();
}

/**
 * 既定ブランチの最新コミット SHA を取得する。
 * 入力: defaultBranch 名。
 * 出力: SHA 文字列。取得できない場合は null。
 */
async function resolveDefaultBranchSha(defaultBranch: string) {
  const refs = [`origin/${defaultBranch}`, defaultBranch];
  for (const ref of refs) {
    const sha = await runGit(['rev-parse', ref]).catch(() => null);
    if (sha) {
      return sha;
    }
  }
  return null;
}

/**
 * SHA が全て 0 のプレースホルダー値か判定する。
 * 入力: SHA 文字列。
 * 出力: 全て 0 なら true、それ以外は false。
 */
function isAllZeroSha(sha: string) {
  return /^0+$/.test(sha);
}

/**
 * ワークスペースルートからの相対パスへ変換する。
 * 入力: 絶対パス。
 * 出力: workspaceRoot からの相対パス（変換不能時は元の文字列）。
 */
function relativeToWorkspace(targetPath: string) {
  return targetPath.startsWith(workspaceRoot)
    ? targetPath.slice(workspaceRoot.length + 1)
    : targetPath;
}

await main();
