FROM ruby:2.5

COPY . /usr/src/app/

WORKDIR /usr/src/app

RUN bundle install