class Request
  attr_reader :method, :url, :headers, :body
  def initialize(data)
    @method  = data.dig('method').downcase
    @url     = data.dig('url', 'raw')
    @headers = data.dig('header')
    @body    = data.dig('body')
  end
end
