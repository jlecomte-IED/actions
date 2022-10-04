FROM docker:stable

RUN apk add --no-cache \
        make curl jq bash git openssl

LABEL "com.github.actions.name"="Docker Make"
LABEL "com.github.actions.description"="Build docker containers using make"
LABEL "com.github.actions.icon"="package"
LABEL "com.github.actions.color"="blue"

LABEL "repository"="http://github.com/fulll/actions"
LABEL "homepage"="http://github.com/fulll"
LABEL "maintainer"="Fulll <contact@fulll.fr>"

ADD entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
