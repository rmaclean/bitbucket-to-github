import { Common } from '../common.ts';

export class LFS {
  private static LFSEnabled = (/true/i).test(Deno.env.get('USE_GIT_LFS') || '');
  private static LFSLimit = Deno.env.get('GIT_LFS_LIMIT');

  configuredLFS = async (common: Common, repoPath: string): Promise<void> => {
    if (!LFS.LFSEnabled) {
      return;
    }

    common.update(`Configuring LFS for ${repoPath}...`);
    await common.runCommand(`git lfs migrate import --above=${LFS.LFSLimit} --everything`, repoPath);
    await common.runCommand(`git lfs fetch --all`, repoPath);
  };
}
