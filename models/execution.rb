class Execution < ActiveRecord::Base
  attr_reader :execution_result
  belongs_to :collection

  def run
    # seconds = 0
    # scheduler = Rufus::Scheduler.new
    # scheduler.every '1s' do
      do_requests
    #   seconds += 1
    #   scheduler.shutdown if seconds == execution_time
    # end
    # scheduler.join
  end

  def to_s
    "id: #{id}, requests_per_second: #{requests_per_second}, execution_time: #{execution_time}"
  end

  private

  def do_requests
    EventMachine.run do
      multi = EventMachine::MultiRequest.new
      starting_time = Time.now
      requests_per_second.times do |i|
        request = Request.new(requests.sample['request'])
        multi.add i.to_s.to_sym,
                  EventMachine::HttpRequest.new(request.url)
                                          .send(request.method,
                                                head: request.headers,
                                                body: request.body)
      end
      multi.callback do
        @execution_result = ExecutionResult.batch(
          multi.responses[:callback].merge(multi.responses[:errback])
        )
        EventMachine.stop
        # delta =  Time.now - starting_time
        # next if delta > 1
        # sleep(delta)
        # do_requests
      end
    end
  end

  def requests
    JSON.parse(collection.data)
  end

  class ExecutionResult
    attr_reader :result
    def initialize
      @result = {}
    end

    def self.batch(responses)
      result_hash = new
      responses.each do |_key, value|
        response = ExecutionResponse.new(value)
        result_hash.add(response)
      end
      result_hash
    end

    def add(response)
      if result.key?(response.url)
        object = result[response.url].detect { |item| item.key?(response.status) }
        if object
          object[response.status] += 1
        else
          result[response.url] << { response.status => 1 }
        end
      else
        result[response.url] = [{ response.status => 1 }]
      end
    end
  end

  class ExecutionResponse
    attr_reader :host, :path, :status
    def initialize(response)
      @host   = response.req.uri.host
      @path   = response.req.uri.path
      @status = response&.response_header&.status&.to_s || response&.error || 'error'
    end

    def url
      "#{host}#{path}"
    end
  end
end
