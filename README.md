# WDI Study Evaluation Script

## Setup

1. Clone this repo.
1. `npm install`
1. Add a CSV file to the `csv` directory for the cohort whose study you are
evaluating. See `020.csv` for an example.
1. Create a `.env` file in the root of this repository. It should have four
variables, `GHUSER`, `GHTOKEN`, `DEVELOPERS`, and `COMMENT`, containing your
GHE handle, your GH API token, the path to your cohorts CSV, and the default
comment you'd like to leave on closed pull requests. For example:
```
GHUSER=caleb-pearce
GHTOKEN=< token goes here>
DEVELOPERS=./csv/test.csv
COMMENT=Nice job!
```

## Use

Run this script with `npm run eval < name-of-study >`.

If you've configured your `.env` and CSV correctly, you'll see the GH handle,
comments, and diff for each PR. You'll be prompted first to say whether the diff
looks like a reasonable attempt at responding to the study. Type `y` if it does,
`n` if it doesn't, `x` to kill the process (and not post any comments or close
any PRs) or `back` to return to the last PR in case you made a mistake.

If you answered `y` above, you'll be asked whether you'd like to use the default
comment, which is whatever the `COMMENT` variable in your `.env` is set to. this
would probably be something like "Nice work!" or "+1" (the thumbs up emoji). You
have the same options here as above. If you enter something other than `y`, `n`,
`x`, or `back` to either of these, it will default to `y`.

If you indicated that you didn't want to use the default comment, you'll be
prompted to enter a custom comment.

Once you've gone through all the PRs, the script will comment and close all the
"reasonable" PRs, and give you a list of PRs that need to be addressed by hand.
It will also let you know whether all the API requests went through succesfully.

For convenience, and because they share some code, this repo also contains a copy
of Antony Donovan's pull request script, found [here](https://git.generalassemb.ly/wdi-bos-faculty/pull-requests). You can run
that script with `npm run pulls < name-of-repo >`. It uses the same `.env` and
CSV directory.



## [License](LICENSE)

1.  All content is licensed under a CC­BY­NC­SA 4.0 license.
1.  All software code is licensed under GNU GPLv3.
