import TunnelKit

class PacketTunnelProvider: OpenVPNTunnelProvider {
  override func startTunnel(
    options: [String: NSObject]? = nil, completionHandler: @escaping (Error?) -> Void
  ) {
    super.startTunnel(options: options, completionHandler: completionHandler)
    let appGroup = "{{GROUP_NAME}}"
    let userDefaults = UserDefaults(suiteName: appGroup)
    let storedInterval = userDefaults?.integer(forKey: "dataCountInterval") ?? 1000
    self.dataCountInterval = storedInterval
  }
}
