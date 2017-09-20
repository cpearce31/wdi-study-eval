URL=$1
REPO=$2
COHORT=$3
GITHUB=$4
TEMPLATE=$5

echo "You entered:"
echo "URL": $URL
echo "REPO": $REPO
echo "COHORT": $COHORT
echo "GITHUB": $GITHUB
echo "Is this correct? (y/n)"

read CONFIRM

if [ $CONFIRM = "y" ]; then

  if [ -d "$COHORT" ]; then
    cd $COHORT/$REPO
    if [ ! -d all-green ]; then
      mkdir all-green
      mkdir not-all-green
    fi
    cd $GITHUB
  else
    mkdir $COHORT
    cd $COHORT

    mkdir $REPO
    cd $REPO

    mkdir $GITHUB
    mkdir all-green
    mkdir not-all-green
    cd $GITHUB
  fi

  rm -rf $REPO
  git clone $URL

  cd $REPO
  git checkout response

  if [ $TEMPLATE = "node" ]; then
    npm install

    RESULT=`grunt test`

    echo `echo $RESULT | grep failing\|Error\|error`
    GREPEXIT=$?

    if [ $GREPEXIT = 0 ]; then
      touch ../../not-all-green/$GITHUB.txt
      grunt test > ../../not-all-green/$GITHUB.txt
    elif [ $GREPEXIT = 1 ]; then
      touch ../../all-green/$GITHUB.txt
      grunt test > ../../all-green/$GITHUB.txt
    else
      echo $'grep barfed.'
    fi
  fi
fi

cd ../..
rm -rf $GITHUB

exit 1
