FROM node:10-alpine

WORKDIR /app
# ADD package.json package.json
ADD . .
RUN yarn


ENTRYPOINT ["./deploy_button"]
