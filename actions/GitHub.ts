import { IRepo } from '../types/IRepo.ts';
import { join } from '@std/path';
import { Common } from '../common.ts';

interface IFetchError extends Error {
  error: {
    errors: {
      code: string;
      message: string;
    }[];
  };
}

export class GitHub {
  private static failOnRepoExists = (/true/i).test(Deno.env.get('FAIL_ON_REPO_EXISTS') || '');

  static async createRepository(common: Common, repository: IRepo) {
    const isOrg = Deno.env.get('GITHUB_USERNAME') !== Deno.env.get('GITHUB_WORKSPACE');
    const url = isOrg
      ? `https://api.github.com/orgs/${Deno.env.get('GITHUB_WORKSPACE')}/repos`
      : 'https://api.github.com/user/repos';

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': 'UA is required',
          Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN')}`,
        },
        body: JSON.stringify({
          name: repository.slug,
          description: repository.description,
          private: repository.is_private,
          has_issues: repository.has_issues,
          has_wiki: repository.has_wiki,
        }),
      });
    } catch (e) {
      // something went wrong, log the message
      // but don't kill the script
      const errors = (e as IFetchError).error?.errors;

      if (errors) {
        if (errors[0].code === 'already_exists') {
          return this.failOnRepoExists;
        }

        for (let i = 0; i < errors.length; i++) {
          common.error(`Failed to create repository ${repository.slug}: ${errors[i].message}`);
        }

        return false;
      }
    }

    return true;
  }

  static async pushRepository(common: Common, repository: IRepo): Promise<boolean> {
    common.update(`Pushing repository ${repository.slug}...`);
    const pathToRepo = join(
      Deno.env.get('PATH_TO_REPO') ?? '',
      repository.slug,
    );

    // initialize a folder and git repo on this machine
    // add Bitbucket as a remote and pull
    const url = `https://${Deno.env.get('GITHUB_USERNAME')}:${Deno.env.get('GITHUB_TOKEN')}@github.com/${
      Deno.env.get('GITHUB_WORKSPACE')
    }/${repository.slug}.git`;

    try {
      const result = await common.runCommand(`git push --mirror ${url}`, pathToRepo);
      common.info(result.stdout + '\n' + result.stderr);
      return result.success;
    } catch (e) {
      common.error(`Failed to push repository ${repository.slug}: ${e}`);
    }

    return false;
  }
}
