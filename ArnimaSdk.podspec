require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "ArnimaSdk"
  s.version      = "1.0.0"
  s.summary      = "ArnimaSdk"
  s.description  = <<-DESC
                  ArnimaSdk
                   DESC
  s.homepage     = "https://github.com/ayanworks/ARNIMA-reactnative-sdk"
  s.authors      = { "AWTS" => "info@ayanworks.com" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/ayanworks/ARNIMA-reactnative-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,swift}"
  s.requires_arc = true

  s.dependency "React"
  s.dependency 'libindy'
  s.dependency 'libindy-objc', '~> 1.8.2'

end

