#!/usr/bin/env ruby

require 'active_record'
require 'dotenv/load'
require 'em-http-request'
require 'rufus-scheduler'

require_relative 'models/collection'
require_relative 'models/execution'
require_relative 'models/request'

ActiveRecord::Base.establish_connection(ENV['DATABASE_URL'])

execution_id = ARGV[0]
@execution = Execution.find(execution_id)
@requests = JSON.parse(@execution.collection.data)
puts @execution.inspect
puts @requests

def call
  EventMachine.run do
    multi = EventMachine::MultiRequest.new
    1.upto(@execution.rps) do |i|
      request = Request.new(@requests.sample['request'])
      multi.add i.to_s.to_sym, EventMachine::HttpRequest.new(request.url)
                                                        .send(request.method)
    end

    multi.callback do
      puts multi.responses[:callback]
      puts multi.responses[:errback]
      EventMachine.stop
    end
  end
end

@execution = Execution.find(execution_id)
puts @execution.to_s
@execution.start
