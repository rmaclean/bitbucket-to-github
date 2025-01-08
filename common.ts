import { Spinner } from '@std/cli/unstable-spinner';

type CommandResult = {
  stdout: string;
  stderr: string;
  success: boolean;
};

export class Common {
  private _log: string[] = [];
  private _spinner: Spinner = new Spinner({ message: 'Warming up...', color: 'magenta' });

  constructor() {
    this._spinner.start();
  }

  runCommand = async (cmd: string, cwd: string): Promise<CommandResult> => {
    const proc = await new Deno.Command('bash', {
      args: ['-c', cmd],
      cwd,
    }).output();

    const stdout = (new TextDecoder().decode(proc.stdout)).trim();
    const stderr = (new TextDecoder().decode(proc.stderr)).trim();

    if (!proc.success) {
      this.error(`Failed to run ${cmd}: ${stderr}`);
    }

    return {
      stdout,
      stderr,
      success: proc.success,
    };
  };

  public get log(): string[] {
    return this.log.slice();
  }

  public get spinner(): Spinner {
    return this._spinner;
  }

  error = (message: string): void => {
    this._spinner.color = 'red';
    this._spinner.message = message;
    this._log.push(`[ERROR] ${message}`);
  };

  update = (message: string): void => {
    this._spinner.message = message;
  };

  info = (message: string): void => {
    this._log.push(`[INFO] ${message}`);
  };

  reposToSkip = async (): Promise<string[]> => {
    const skipContents = await Deno.readTextFile('skip.txt');
    return skipContents.split('\n').filter((line) => line.trim());
  };
}
