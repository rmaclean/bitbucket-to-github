## Bitbucket to GitHub Migration

This repository transfers ALL of your Bitbucket repositories to GitHub while maintaining its privacy status.

### Getting Started

Make sure you have Deno before continuing.

##### Clone the repo

`git clone https://github.com/pouriaa/bitbucket-to-github.git`

##### Enter the repo

`cd bitbucket-to-github/`

##### Install dependencies

`deno i`

##### Make an environment variable file

`cp .env.sample .env`

##### Create an access token on GitHub

Use `https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/` to create your token.

##### Enter your GitHub and Bitbucket credentials to `.env`

It should be noted that the Bitbucket 'username' is not your email address but 'https://bitbucket.org/{username}/tisplunkmint/src/develop/'

It should also be noted that the GitHub token requires full repo permissions if you want to create private repositories.

##### Run the script

`deno -A index.ts`
