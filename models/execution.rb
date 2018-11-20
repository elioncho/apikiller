class Execution < ActiveRecord::Base
  belongs_to :collection

  def start
    requests  = JSON.parse(collection.data)
    scheduler = Rufus::Scheduler.new
    seconds   = 0
    scheduler.every '1s' do
      do_requests(requests)
      seconds += 1
      scheduler.shutdown if seconds == exec_time
    end
    scheduler.join
  end

  def to_s
    "id: #{id}, requests_per_second: #{rps}, running_time: #{exec_time}"
  end

  private

  # TODO: move this elsewhwere
  def do_requests(requests)
    EventMachine.run do
      multi = EventMachine::MultiRequest.new
      1.upto(rps) do |i|
        request = Request.new(requests.sample['request'])
        multi.add i.to_s.to_sym, EventMachine::HttpRequest.new(request.url)
                                                          .send(request.method,
                                                                head: request.headers,
                                                                body: request.body)
      end
      multi.callback do
        puts multi.responses[:callback]
        puts multi.responses[:errback]
        EventMachine.stop
      end
    end
  end
end
