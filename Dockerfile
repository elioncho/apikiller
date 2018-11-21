FROM ruby:2.5-alpine as DEVELOPMENT
RUN ln -sf /usr/share/zoneinfo/GMT /etc/localtime
ENV APP /usr/src/app/
WORKDIR ${APP}
RUN apk add --no-cache g++ musl-dev make postgresql-dev
ENTRYPOINT [ "./index.rb" ]

FROM DEVELOPMENT as PRODUCTION
ADD Gemfile* ${APP}
RUN bundle install
ADD . ${APP}