class Execution < ActiveRecord::Base
  belongs_to :collection

  def result_hash
    @result_hash ||= {}
  end

  def run
    seconds = 0
    scheduler = Rufus::Scheduler.new
    scheduler.every '1s' do
      do_requests
      seconds += 1
      scheduler.shutdown if seconds == execution_time
    end
    scheduler.join
  end

  def to_s
    "id: #{id}, requests_per_second: #{requests_per_second}, execution_time: #{execution_time}"
  end

  private

  # TODO: move this elsewhwere
  def do_requests
    EventMachine.run do
      multi = EventMachine::MultiRequest.new
      requests_per_second.times do |i|
        request = Request.new(requests.sample['request'])
        multi.add i.to_s.to_sym,
                  EventMachine::HttpRequest.new(request.url)
                                           .send(request.method,
                                                 head: request.headers,
                                                 body: request.body)
      end
      multi.callback do
        #puts multi.responses[:callback]
        multi.responses[:callback].each do |_key, value|
          uri         = "#{value.req.uri.host}#{value.req.uri.path}"
          http_status = value.response_header.http_status.to_s
          if result_hash.key?(uri)
            hash = result_hash[uri].detect { |item| item.key?(http_status) }
            if hash
              hash[http_status] += 1
            else
              result_hash[uri] << { http_status => 1 }
            end
          else
            result_hash[uri] = []
            result_hash[uri] << { http_status => 1 }
          end
        end

        multi.responses[:errback].each do |_key, value|
          uri   = "#{value.req.uri.host}#{value.req.uri.path}"
          error = value.error || 'error'
          if result_hash.key?(uri)
            hash = result_hash[uri].detect { |item| item.key?(error) }
            if hash
              hash[error] += 1
            else
              result_hash[uri] << { error => 1 }
            end
          else
            result_hash[uri] = []
            result_hash[uri] << { error => 1 }
          end
        end
        EventMachine.stop
      end
    end
  end

  def requests
    JSON.parse(collection.data)
  end
end
