class Request
  attr_reader :method, :url
  def initialize(data)
    @method = data.dig('method').downcase
    @url    = data.dig('url', 'raw')
  end
end
