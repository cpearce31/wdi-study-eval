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

Run this script with `npm start <name-of-study`.

If you've configured your `.env` and CSV correctly, you'll then see the PR
comment for each pull request. On this pass through, you're just looking for
questions or 1:1 requests. If the developer's PR comment needs more than your
default response, press `n` and hit enter. You'll be able to add a more detailed
comment later. Otherwise, press `y` and hit enter to use the default comment.
You can kill the process by responding `x`. No comments will be made and no PRs
will be closed.

Then, you'll see the diff for each PR. Respond `y` if it's a reasonable attempt
at answering the questions, or `n` if not. If you respond `n`, you'll need to
address those crappy PRs in real life. If you respond 'y', and you chose to use
the default comment for that PR, it will be closed, and the default comment will
be added.

For any PRs that you chose not to use the default comment for, you'll be shown
the comment and the diff, and asked to leave a custom comment. Then, the PR will
be closed and your comment added.

Finally, you'll be shown a list of PRs that need to be addressed in real life,
and a message confirming that all of the API requests to close and comment were
succesful.

## [License](LICENSE)

1.  All content is licensed under a CC­BY­NC­SA 4.0 license.
1.  All software code is licensed under GNU GPLv3.
