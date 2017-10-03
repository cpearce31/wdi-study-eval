# WDI Study Evaluation Script

## Setup

1. Clone this repo.
1. Run `npm install`
1. Run `nvm install v8.0.0`.
1. Add a CSV file to the `csv` directory for the cohort whose study you are
evaluating. See `020.csv` for an example.
1. Create a `.env` file in the root of this repository. It should have four
variables, `GHUSER`, `GHTOKEN`, `DEVELOPERS`,`COMMENT`, and `RESULTSDIR`.

- `GHUSER` is your Github Enterprise username
- `GHTOKEN` is a GHE API token, which you can [here](https://git.generalassemb.ly/settings/tokens/)
- `DEVELOPERS` is the path to the CSV you currently want to use
- `COMMENT` is the comment that will be left on PRs if you choose the 'use
default comment' option on a PR
- `RESULTSDIR` is the absolute path to an empty directory anywhere on your
computer (preferably not in a git repository) that will contain the results
of tests run by these scripts

For example:
```
GHUSER=caleb-pearce
GHTOKEN=< token goes here>
DEVELOPERS=./csv/test.csv
COMMENT=Nice job!
RESULTSDIR=/home/caleb/code/scripts/test-results
```

## Use

If the repo you're evaluating has tests, run those tests with
`npm run tests < name-of-repo > < template >`, where `< template >` is either
`node` or `ruby`, depending on whether the tests use Mocha or Rspec. The test
results will be saved to `RESULTSDIR`, but you don't need to interact with them
manually there.

Run the evalution script with `npm run eval < name-of-repo >`.

If you've configured your `.env` and CSV correctly, you'll see the GH handle,
comments, test results, and diff for each PR. You'll first be prompted on
whether you want to close and comment the displayed PR. Type `y` if the PR looks
like it can be addressed with either the default comment or a custom one, and
doesn't require IRL attention. If you respond `n`, the PR will not be closed,
and no comments will be left. You'll see a list of all unclosed PRs at the end.
Respond with `x` to exit the script. If you do this (ctrl + c), no PRs will be
closed or commented! None! If you respond with `back`, you'll have a chance to
redo the previously displayed PR. You can change your comment, decide not to
close it, etc.

If you see `Tests: failed`, it means that the PR contained a syntax error that
prevented the tests from running at all. If you don't see anything about tests,
it means you haven't run `npm run tests` for this repo.

If you answered `y` above, you'll be asked whether you'd like to use the default
comment, which is whatever the `COMMENT` variable in your `.env` is set to. this
would probably be something like "Nice work!" or "+1" (the thumbs up emoji). You
have the same options here as above. If you enter something other than `y`, `n`,
`x`, or `back` to either of these, it will default to `y`.

If you indicated that you didn't want to use the default comment, you'll be
prompted to enter a custom comment.

Once you've gone through all the PRs, the script will comment and close all the
PRs that you told it to, and give you a list of PRs that need to be addressed by
hand. It will also let you know whether all the API requests went through
succesfully.

For convenience, and because they share some code, this repo also contains a
copy of Antony Donovan's pull request script, found
[here](https://git.generalassemb.ly/wdi-bos-faculty/pull-requests). You can run
that script with `npm run pulls < name-of-repo >`. It uses the same `.env` and
CSV directory.



## [License](LICENSE)

1.  All content is licensed under a CC­BY­NC­SA 4.0 license.
1.  All software code is licensed under GNU GPLv3.
