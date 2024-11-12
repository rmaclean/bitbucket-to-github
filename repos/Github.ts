import { Spinner } from '@std/cli/unstable-spinner';
import { IRepo } from "../types/IRepo.ts";
import { join } from "@std/path";

export class Github {
  /**
   * Create repositories on Github an array
   * of Bitbucket repositories
   *
   * @param {Array} repositories
   * @returns {Array} of successfully created `repositories`
   */
  static async createRepositories(spinner: Spinner, repositories: IRepo[]): Promise<IRepo[]> {
    // keep track of which repos have failed to be created on Github
    const successfulRepos = [];

    for await (const respository of repositories) {
      // create the repository
      const success = await Github.createRepository(spinner, respository);

      // we don't want to try to clone to existing repos later
      if (success) {
        spinner.message = `Created repository for ${respository.slug}!`;
        successfulRepos.push(respository);
      }
    }

    return successfulRepos;
  }

  /**
   * Create a new repository on Github.
   *
   * @param {Object} repository single Bitbucket repo resource
   * @returns {Bolean} success status
   */
  static async createRepository(spinner: Spinner, repository: IRepo) {
    const isOrg =
      Deno.env.get("GITHUB_USERNAME") !== Deno.env.get("GITHUB_WORKSPACE");
    const url = isOrg
      ? `https://api.github.com/orgs/${Deno.env.get("GITHUB_WORKSPACE")}/repos`
      : "https://api.github.com/user/repos";

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": "UA is required",
          Authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
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
      const errors = (e as any).error?.errors;

      if (errors) {
        if (errors[0].code === "already_exists") {
          return true;
        }

        for (let i = 0; i < errors.length; i++) {
          spinner.color = "red";
          spinner.message = `Failed to create repository ${repository.slug}: ${errors[i].message}`;
        }

        return false;
      }
    }

    return true;
  }

  static async pushRepositories(spinner: Spinner, repositories: IRepo[]): Promise<IRepo[]> {
    // keep track of which repos have failed to be pushed to Github
    const successfulRepos = [];

    for await (const repo of repositories) {
      // create the repository
      const success = await Github.pushRepository(spinner, repo);

      // keep track of which repos were pushed for reporting
      if (success) {
        spinner.message = `Pushed repository for ${repo.slug}!`;
        successfulRepos.push(repo);
      }
    }

    return successfulRepos;
  }

  /**
   * Push to the repository a new repository on Github.
   *
   * @param {Object} repository single Bitbucket repo resource
   * @returns {Bolean} success status
   */
  static async pushRepository(spinner: Spinner, repository: IRepo): Promise<boolean> {
    spinner.message = `Pushing repository ${repository.slug}...`;
    const pathToRepo = join(
      Deno.env.get("PATH_TO_REPO") ?? "",
      repository.slug,
    );

    // initialize a folder and git repo on this machine
    // add Bitbucket as a remote and pull
    const url = `https://${Deno.env.get("GITHUB_USERNAME")}:${Deno.env.get("GITHUB_TOKEN")
      }@github.com/${Deno.env.get("GITHUB_WORKSPACE")}/${repository.slug}.git`;

    try {
      const proc = await new Deno.Command("git", {
        args: ["push", "--mirror", url],
        cwd: pathToRepo,
      }).output();

      await Deno.stderr.write(proc.stderr);
      await Deno.stdout.write(proc.stdout);

      return proc.success;
    } catch (e) {
      spinner.color = "red";
      spinner.message = `Failed to push repository ${repository.slug}: ${e}`;
    }

    return false;
  }
}
