class Execution < ActiveRecord::Base
  belongs_to :collection

  def start
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
      requests_per_second.times do
        request = Request.new(requests.sample['request'])
        multi.add i.to_s.to_sym,
                  EventMachine::HttpRequest.new(request.url)
                                           .send(request.method,
                                                 head: request.headers,
                                                 body: request.body)
      end
      multi.callback do
        #puts multi.responses[:callback]
        #puts multi.responses[:errback]
        EventMachine.stop
      end
    end
  end

  def requests
    JSON.parse(collection.data)
  end
end
