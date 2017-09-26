REPO=$1
COHORT=$2
RESULTSDIR=$3
TEMPLATE=$4
URL=$5

mkdir -p $RESULTSDIR/$COHORT/$REPO
cd $RESULTSDIR/$COHORT/$REPO

git clone $URL

cd $REPO

if [ "$TEMPLATE" = "node" ]; then
  echo `npm install`
fi

if [ "$TEMPLATE" = "ruby"]; then
  echo `bundle install`
fi
