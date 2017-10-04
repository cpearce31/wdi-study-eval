# WDI Study Evaluation Script

## Setup

1. Clone this repo
1. Run `npm install`
1. Run `nvm install v8.0.0`
1. Create a `.env` file in the root of this repository (`touch .env`)
1. Create a directory somewhere on your computer (not in this repository) to store the results of
of automated tests
    - For example, `mkdir ~/< wherever >/test-results`
1. Get a [Github API token](https://git.generalassemb.ly/settings/tokens/)
    - Click "Generate new token"
    - Enter your password if prompted
    - Enter a token description - whatever you want. Maybe "study-evaluator"?
    - Check the "repo" box under "Select scopes"
    - Click "Generate token" and copy it to the clipboard
1. Now, open the `.env` in Atom (`atom .env`)
1. Edit the `.env` to match the format below. Note that there are no spaces between the variable name, the equals sign, or the value.
```
GHUSER=caleb-pearce
GHTOKEN=< token goes here >
DEVELOPERS=./csv/test.csv
COMMENT=Nice job!
RESULTSDIR=/home/caleb/code/scripts/test-results
```
    - `GHUSER` should be your Github Enterpries Username
    - `GHTOKEN` is the token you just createReadStream
    - `DEVELOPERS` is the path to the CSV for the cohort you want to evaluate
      assignments for
    - `COMMENT` is the default you will leave when closing studies
    - `RESULTSDIR` is the absolute path to the directory you created to store
test results

## Use

1. Determine whether the repo you're evaluating has tests.
1. If it does:
    - Run those tests with `npm run tests < name-of-repo >`
    - This will save the results of those tests to
    `< $RESULTSDIR >/< cohort >/< repo >/< developer >.txt`. You don't need to interact with them there to see their score, but you can look there if you need to know which tests failed.
1. Run the evaluation script with `npm run eval < name-of-repo >`
    - For each pull request, you'll see their GHE handle, the PR body (the comment they add when opening the PR), test results (if there are tests),
    and the diff between their response and the blank study/diagnostic/etc.
    - You'll first be prompted on
    whether you want to close and comment the displayed PR.
        - Type `y` if the PR looks like it can be addressed with either the default comment or a custom one, and doesn't require IRL attention.
        - If you respond `n`, the PR will not be closed,
        and no comments will be left. You'll see a list of all unclosed PRs at the end.
        - Respond with `x` to exit the script. If you do this (or ctrl + c), no PRs will be closed or commented! None!
        - If you respond with `back`, you'll have a chance to
        redo the previously displayed PR. You can change your comment, decide not to close it, etc.
    - If you see `Tests: failed` it means that the PR contained a syntax error that prevented the tests from running at all. This probably the fault of the developer, not this script, but you never know. If you don't see anything about tests, it means you haven't run `npm run tests` for this repo.
    - If you answered `y` above, you'll be asked whether you'd like to use the default
    comment, which is whatever the `COMMENT` variable in your `.env` is set to.
        - This would probably be something like "Nice work!" or `:+1:` (the thumbs up emoji).
        - You have the same options here as above (y/n/x/back)
    - If you indicated that you didn't want to use the default comment, you'll be prompted to enter a custom comment.
    - Once you've gone through all the PRs, the script will comment and close all the PRs that you told it to, and give you a list of PRs that need to be addressed by hand. It will also let you know whether all the API requests went through succesfully.
1. For convenience, and because they share some code, this repo also contains a
copy of Antony Donovan's pull request script, found
[here](https://git.generalassemb.ly/wdi-bos-faculty/pull-requests). You can run
that script with `npm run pulls < name-of-repo >`. It uses the same `.env` and
CSV directory.


## [License](LICENSE)

1.  All content is licensed under a CC­BY­NC­SA 4.0 license.
1.  All software code is licensed under GNU GPLv3.
