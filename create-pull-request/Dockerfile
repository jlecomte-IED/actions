FROM alpine:latest

LABEL "com.github.actions.name"="Create pull request"
LABEL "com.github.actions.description"="Create pull request after a pull request has been merged"
LABEL "com.github.actions.icon"="activity"
LABEL "com.github.actions.color"="blue"

RUN	apk add --no-cache \
	bash \
	ca-certificates \
	curl \
	jq

COPY create-pull-request-actions /usr/bin/create-pull-request/action

ENTRYPOINT ["create-pull-request-actions"]
