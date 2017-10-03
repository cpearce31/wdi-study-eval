REPO=$1
COHORT=$2
RESULTSDIR=$3
URL=$4

mkdir -p $RESULTSDIR/$COHORT/$REPO
cd $RESULTSDIR/$COHORT/$REPO

git clone $URL

cd $REPO/lib

DIDBUILD=false

if ls | grep -q .js; then
  if npm install > /dev/null; then
    echo "js"
    DIDBUILD=true
  fi
fi

if ls | grep -q .rb; then
  if bundle install > /dev/null; then
    echo "rb"
    DIDBUILD=true
  fi
fi

if [ $DIDBUILD = false]; then
  echo "fail"
fi
