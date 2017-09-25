REPO=$1
COHORT=$2
GITHUB=$3
TEMPLATE=$4
RESULTSDIR=$5

cd $RESULTSDIR/$COHORT/$REPO/$REPO

if [ $TEMPLATE = "node" ]; then
  RESULT="$(timeout 15s grunt test)"
elif [ $TEMPLATE = "ruby"]; then
  RESULT="$(timout 15s bin/rake test)"
fi

touch ../$GITHUB.txt

HEADER="=== $GITHUB ===\n\n"

echo "$HEADER$RESULT\n" > ../$GITHUB.txt
