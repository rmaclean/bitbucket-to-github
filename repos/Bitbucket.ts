import { Spinner } from "@std/cli/unstable-spinner";
import { IBitbucketRepos, IRepo } from "../types/IRepo.ts";

export class Bitbucket {
  /**
   * Gets all of a user's bitbucket repositories
   *
   * @returns {Array} list of repositories from Bitbucket
   */
  static async getRepositories(spinner: Spinner): Promise<IRepo[]> {
    const repoList: IRepo[] = [];
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
            )
              }`,
          },
        },
      );

      if (response.ok) {
        parsed = await response.json();
        // console.log(parsed)
        if (!parsed) {
          spinner.color = "red";
          spinner.message = "Could not parse bitbucket info";
          continue;
        }

        repoList.push(...parsed.values);

        currentPage++;
      } else {
        spinner.color = "red";
        spinner.message = `Could not get bitbucket info: ${await response.text()}`
      }
      // while there's another page to hit, loop
    } while (parsed?.next);

    if (repoList.length === 0) {
      spinner.color = "red";
      spinner.message = `No repositories found for ${Deno.env.get("BITBUCKET_WORKSPACE")}`;
    }

    return repoList;
  }

  /**
   * Clones repositories from Bitbucket
   * into a local folder
   *
   * @param {Array} repositories
   */
  static async pullRepositories(spinner: Spinner, repositories: IRepo[]): Promise<IRepo[]> {
    const successfulRepos = [];
    for await (const repository of repositories) {
      spinner.message = `Starting pull of ${repository.slug}...`;

      // create the repository
      const success = await Bitbucket.pullRepository(spinner, repository);

      // we don't want to try to push to repos that errored out
      if (success) {
        spinner.message = `Completed pull of ${repository.slug}!`;
        successfulRepos.push(repository);
      }
    }

    return successfulRepos;
  }

  /**
   * Clone a new repository from Bitbucket.
   *
   * @param {Object} repository single Bitbucket repo resource
   * @returns {Bolean} success status
   */
  static async pullRepository(spinner: Spinner, repository: IRepo): Promise<boolean> {
    // path to the local repository
    const pathToRepo = Deno.env.get("PATH_TO_REPO");

    // initialize a folder and git repo on this machine
    // add Bitbucket as a remote and pull
    // `repository.links.clone[0].href`?
    const repoUrl = `https://${Deno.env.get("BITBUCKET_USERNAME")}:${Deno.env.get("BITBUCKET_PASSWORD")
      }@bitbucket.org/${Deno.env.get("BITBUCKET_WORKSPACE")
      }/${repository.slug}.git`;

    try {
      spinner.message = `Cloning ${repository.slug}...`;
      // initialize repo
      const proc = await new Deno.Command("git", {
        args: ["clone", "--bare", repoUrl, repository.slug],
        cwd: pathToRepo,
      }).output();

      await Deno.stderr.write(proc.stderr);
      await Deno.stdout.write(proc.stdout);

      return proc.success;
    } catch (e) {
      spinner.color = "red";
      spinner.message = `Failed to clone ${repository.slug}: ${e}`;
    }

    return false;
  }
}
