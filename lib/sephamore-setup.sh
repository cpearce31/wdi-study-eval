REPO=$1
COHORT=$2
RESULTSDIR=$3
TEMPLATE=$4
URL=$5

mkdir -pv $RESULTSDIR/$COHORT/$REPO
cd $RESULTSDIR/$COHORT/$REPO

git clone $URL

cd $REPO

if [ $TEMPLATE = "node" ]; then
  npm install
elif [ $TEMPLATE = "ruby"]; then
  bundle install
else
  echo "Invalid template. You probably want 'node' or 'ruby'."
fi
