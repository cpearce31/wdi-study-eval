REPO=$1
COHORT=$2
GITHUB=$3
TEMPLATE=$4
RESULTSDIR=$5

cd $RESULTSDIR/$COHORT/$REPO/$REPO

if [ $TEMPLATE = "node" ]; then
  RESULT="$(grunt test)"
elif [ $TEMPLATE = "ruby"]; then
  RESULT="$(bin/rake test)"
fi

touch ../$GITHUB.txt

echo "$RESULT" > ../$GITHUB.txt
