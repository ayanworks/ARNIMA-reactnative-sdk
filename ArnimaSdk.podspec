require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "ArnimaSdk"
  s.version      = "1.0.0"
  s.summary      = "ArnimaSdk"
  s.description  = <<-DESC
                  ArnimaSdk
                   DESC
  s.homepage     = "https://github.com/github_account/react-native-my-fancy-library"
  s.license      = "MIT"
  # s.license      = { :type => "MIT", :file => "FILE_LICENSE" }
  s.authors      = { "AWTS" => "info@ayanworks.com" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/github_account/react-native-my-fancy-library.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,swift}"
  s.requires_arc = true
  # s.vendored_libraries = 'libsodium/libsodium-ios/lib/libsodium.a'

  s.dependency "React"
  s.dependency 'libindy'
  s.dependency 'libindy-objc', '~> 1.8.2'
  # ...
  # s.dependency "..."

end

