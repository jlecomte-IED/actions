FROM node:10

LABEL "com.github.actions.name"="Github Deployment"
LABEL "com.github.actions.description"="Create an actionable deployment after a release"
LABEL "com.github.actions.icon"="upload-cloud"
LABEL "com.github.actions.color"="blue"

LABEL "repository"="http://github.com/fulll/actions"
LABEL "homepage"="http://github.com/fulll"
LABEL "maintainer"="Fulll <contact@fulll.fr>"

RUN mkdir -p /app
ADD package.json /app/package.json
RUN cd /app && yarn
ADD . /app

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
