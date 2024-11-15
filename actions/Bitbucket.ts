import { IBitbucketRepos, IRepo } from "../types/IRepo.ts";
import { Common } from '../common.ts';
import { join } from '@std/path/join';

export class Bitbucket {
  private static alreadyCloned = async (common: Common, pathToRepo: string): Promise<boolean> => {
    let pathInfo;
    try {
      pathInfo = await Deno.stat(pathToRepo);
    } catch {
      return false;
    }

    if (!pathInfo.isDirectory) {
      throw new Error(`${pathToRepo} is not a directory`);
    }

    const result = await common.runCommand("git rev-parse --is-bare-repository", pathToRepo);
    return result.stdout === "true";
  }

  static async * getRepositories(common: Common) {
    let parsed: IBitbucketRepos | undefined = undefined;
    let currentPage = 1;

    do {
      const response = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${Deno.env.get("BITBUCKET_WORKSPACE")
        }?page=${currentPage}`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(
              `${Deno.env.get("BITBUCKET_USERNAME")}:${Deno.env.get("BITBUCKET_PASSWORD")
              }`,
            )}`,
          },
        },
      );

      if (response.ok) {
        parsed = await response.json();
        if (!parsed) {
          common.error("Could not parse bitbucket info");
          continue;
        }

        for (const repo of parsed.values) {
          yield repo;
        }

        currentPage++;
      } else {
        common.error(`Could not get bitbucket info: ${await response.text()}`);
      }
      // while there's another page to hit, loop
    } while (parsed?.next);
  }

  static async pullRepository(common: Common, repository: IRepo): Promise<boolean> {
    // path to the local repository
    const pathToRepo = Deno.env.get("PATH_TO_REPO");

    if (!pathToRepo) {
      throw new Error("PATH_TO_REPO is not set");
    }

    // initialize a folder and git repo on this machine
    // add Bitbucket as a remote and pull
    // `repository.links.clone[0].href`?
    const repoUrl = `https://${Deno.env.get("BITBUCKET_USERNAME")}:${Deno.env.get("BITBUCKET_PASSWORD")
      }@bitbucket.org/${Deno.env.get("BITBUCKET_WORKSPACE")
      }/${repository.slug}.git`;

    try {
      const alreadyCloned = await this.alreadyCloned(common, join(pathToRepo, repository.slug));
      if (alreadyCloned) {
        common.update(`Updating existing repo ${repository.slug}...`);
        const result = await common.runCommand("git fetch", pathToRepo);
        return result.success;
      } else {
        common.update(`Cloning ${repository.slug}...`);
        // initialize repo

        const result = await common.runCommand(`git clone --bare ${repoUrl} ${repository.slug}`, pathToRepo);
        return result.success;
      }
    } catch (e) {
      common.error(`Failed to clone/pull ${repository.slug}: ${e}`);
    }

    return false;
  }
}
