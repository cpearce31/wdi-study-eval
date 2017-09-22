URL=$1
REPO=$2
COHORT=$3
GITHUB=$4
TEMPLATE=$5
RESULTSDIR=$6

echo "Building directory with these arguments:"
echo "URL": $URL
echo "REPO": $REPO
echo "COHORT": $COHORT
echo "GITHUB": $GITHUB

cd $RESULTSDIR/$COHORT/$REPO

mkdir $GITHUB
cd $GITHUB

git clone $URL

cd $REPO
git checkout response

if [ $TEMPLATE = "node" ]; then
  npm install

  echo "template did equal node"

  RESULT=`grunt test`

  echo $RESULT

  touch ../../$GITHUB.txt
  printf $RESULT > ../../$GITHUB.txt
fi

cd ../..
rm -rf $GITHUB
