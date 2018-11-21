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
puts @execution.to_s
@execution.start
