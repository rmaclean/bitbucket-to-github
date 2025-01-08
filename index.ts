import { join } from '@std/path';
import { Bitbucket } from './actions/Bitbucket.ts';
import { GitHub } from './actions/GitHub.ts';
import '@std/dotenv/load';
import { Common } from './common.ts';
import { LFS } from './actions/LFS.ts';

const pathToRepo = join(import.meta.dirname ?? '', 'repositories');
Deno.env.set('PATH_TO_REPO', pathToRepo);
console.log(`Will store repos into: ${pathToRepo}`);
await Deno.mkdir(pathToRepo, { recursive: true });

const common = new Common();
const lfs = new LFS();

const results: { name: string; state: string }[] = [];
const reposToSkip = await common.reposToSkip();

console.log(`Skipping repos: ${reposToSkip.join(', ')}`);

for await (const repo of Bitbucket.getRepositories(common)) {
  results.push({ name: repo.slug, state: '' });
  if (reposToSkip.includes(repo.slug)) {
    results.find((r) => r.name === repo.slug)!.state = 'skipped';
    continue;
  }

  const created = await GitHub.createRepository(common, repo);
  if (created) {
    results.find((r) => r.name === repo.slug)!.state = 'created';
    const pulled = await Bitbucket.pullRepository(common, repo);
    if (pulled) {
      results.find((r) => r.name === repo.slug)!.state = 'pulled';

      await lfs.configuredLFS(common, join(pathToRepo, repo.slug));

      results.find((r) => r.name === repo.slug)!.state = 'lfs setup';

      const success = await GitHub.pushRepository(common, repo);
      results.find((r) => r.name === repo.slug)!.state = success ? 'done' : 'failed push';
    } else {
      results.find((r) => r.name === repo.slug)!.state = 'failed pull';
    }
  } else {
    results.find((r) => r.name === repo.slug)!.state = 'failed create';
  }
}

common.spinner.stop();

console.table(results);
