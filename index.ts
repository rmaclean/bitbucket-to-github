import { join } from '@std/path';
import { Bitbucket } from './repos/Bitbucket.ts';
import { Github } from './repos/Github.ts';
import '@std/dotenv/load';
import { Spinner } from '@std/cli/unstable-spinner';

// get all the bitbucket repositories we're going to transfer
const pathToRepo = join(import.meta.dirname ?? '', 'repositories');
Deno.env.set('PATH_TO_REPO', pathToRepo);
console.log(`Will store repos into: ${pathToRepo}`);
await Deno.mkdir(pathToRepo, { recursive: true });

const spinner = new Spinner({ message: 'Migrating...', color: 'magenta' });
spinner.start();

const repositories = await Bitbucket.getRepositories(spinner);

// create a new repository on Github for the repos
const successfulCreates = await Github.createRepositories(spinner, repositories);

// clone into a local folder
const successfulClones = await Bitbucket.pullRepositories(spinner, successfulCreates);

// push to Github
const succesfulPushes = await Github.pushRepositories(spinner, successfulClones);

console.log('Migrated the following repos sucessfully:\r\n', succesfulPushes.map((repo) => repo.slug).join('\r\n'));
