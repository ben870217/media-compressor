FROM node:26-alpine

RUN apk add --no-cache chromium ffmpeg

WORKDIR /app

CMD ["tail", "-f", "/dev/null"]
