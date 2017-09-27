REPO=$1
COHORT=$2
GITHUB=$3
TEMPLATE=$4
RESULTSDIR=$5

cd $RESULTSDIR/$COHORT/$REPO/$REPO

HEADER="=== $GITHUB ===\n\n"
touch ../$GITHUB.txt

if [ $TEMPLATE = "node" ]; then
  RESULT="$(timeout 15s grunt test)"
  echo "$HEADER$RESULT\n" > ../$GITHUB.txt
fi

if [ $TEMPLATE = "ruby" ]; then
  RESULT="$(timeout 15s bundle exec rake test)"
  echo "$HEADER$RESULT\n" > ../$GITHUB.txt
fi
