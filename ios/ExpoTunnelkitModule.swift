import ExpoModulesCore
import Foundation
import NetworkExtension
import TunnelKit

private enum ReadableConnectionStatus: String {
  case invalid = "Invalid"
  case disconnected = "Disconnected"
  case connecting = "Connecting"
  case connected = "Connected"
  case reasserting = "Reasserting"
  case disconnecting = "Disconnecting"
  case none = "None"
  case unknown = "Unknown"
}

// Extend NEVPNStatus to map to ReadableConnectionStatus
extension NEVPNStatus {
  fileprivate var readableStatus: ReadableConnectionStatus {
    switch self {
    case .invalid:
      return .invalid
    case .disconnected:
      return .disconnected
    case .connecting:
      return .connecting
    case .connected:
      return .connected
    case .reasserting:
      return .reasserting
    case .disconnecting:
      return .disconnecting
    @unknown default:
      return .unknown
    }
  }
}

public class ExpoTunnelkitModule: Module {
  private var status = NEVPNStatus.invalid
  private var currentManager: NETunnelProviderManager?

  private var dataCountInterval: Int = 1000

  private var sessionBuilder = OpenVPN.ConfigurationBuilder()
  private var builtSession: OpenVPN.Configuration?
  private var openVPNTunnelProviderConfiguration: OpenVPNTunnelProvider.Configuration?

  private var appGroup: String?
  private var tunnelIdentifier: String?

  private var username: String?
  private var password: String?

  private var tlsWrapStrategy: OpenVPN.TLSWrap.Strategy?
  private var tlsWrapKeyData: Data?
  private var tlsWrapKeyDirection: OpenVPN.StaticKey.Direction?

  private func setTlsWrap() {
    if let key = tlsWrapKeyData, let strategy = tlsWrapStrategy {
      let tlsKey = OpenVPN.StaticKey(data: key, direction: tlsWrapKeyDirection)
      sessionBuilder.tlsWrap = OpenVPN.TLSWrap(strategy: strategy, key: tlsKey)
    }
  }

  private var socketType: SocketType?
  private var port: UInt16?

  private func setEndpointProtocol() {
    if let socketType = socketType, let port = port {
      sessionBuilder.endpointProtocols = [EndpointProtocol(socketType, port)]
    }
  }

  private struct OpenVPNTunnelProviderSettings {
    var prefersResolvedAddresses: Bool?
    var resolvedAddresses: [String]?
    var mtu: Int?
    var shouldDebug: Bool?
    var debugLogFormat: String?
    var masksPrivateData: Bool?
  }

  private var tunnelProviderSettings = OpenVPNTunnelProviderSettings()

  private func makeProtocol() -> NETunnelProviderProtocol? {
    guard let appGroup = self.appGroup, let tunnelIdentifier = self.tunnelIdentifier else {
      return nil
    }

    let userDefaults = UserDefaults(suiteName: appGroup)
    // Update the interval in UserDefaults
    userDefaults?.set(dataCountInterval, forKey: "dataCountInterval")

    let credentials = OpenVPN.Credentials(self.username ?? "", self.password ?? "")
    var builder = OpenVPNTunnelProvider.ConfigurationBuilder(
      sessionConfiguration: self.sessionBuilder.build()
    )

    builder.prefersResolvedAddresses = self.tunnelProviderSettings.prefersResolvedAddresses ?? false
    builder.resolvedAddresses = self.tunnelProviderSettings.resolvedAddresses
    builder.mtu = self.tunnelProviderSettings.mtu ?? 1250
    builder.shouldDebug = self.tunnelProviderSettings.shouldDebug ?? false
    builder.debugLogFormat = self.tunnelProviderSettings.debugLogFormat
    builder.masksPrivateData = self.tunnelProviderSettings.masksPrivateData

    let configuration = builder.build()
    //      configuration.dataCount(in: appGroup)
    self.openVPNTunnelProviderConfiguration = configuration
    do {
      let p = try configuration.generatedTunnelProtocol(
        withBundleIdentifier: tunnelIdentifier,
        appGroup: appGroup,
        credentials: credentials
      )
      return p
    } catch {
      print("Error generating tunnel protocol: \(error)")
      return nil
    }
  }

  private func configureVPN(
    _ configure: @escaping (NETunnelProviderManager) -> NETunnelProviderProtocol?,
    completionHandler: @escaping (Error?) -> Void
  ) {
    reloadCurrentManager { (error) in
      if let error = error {
        print("error reloading preferences: \(error)")
        completionHandler(error)
        return
      }

      let manager = self.currentManager!
      if let protocolConfiguration = configure(manager) {
        manager.protocolConfiguration = protocolConfiguration
      }
      manager.isEnabled = true

      manager.saveToPreferences { (error) in
        if let error = error {
          print("error saving preferences: \(error)")
          completionHandler(error)
          return
        }
        print("saved preferences")
        self.reloadCurrentManager(completionHandler)
      }
    }
  }

  private func reloadCurrentManager(_ completionHandler: ((Error?) -> Void)?) {
    NETunnelProviderManager.loadAllFromPreferences { (managers, error) in
      if let error = error {
        completionHandler?(error)
        return
      }

      var manager: NETunnelProviderManager?

      for m in managers! {
        if let p = m.protocolConfiguration as? NETunnelProviderProtocol {
          if let tunnelIdentifier = self.tunnelIdentifier,
            p.providerBundleIdentifier == tunnelIdentifier
          {
            manager = m
            break
          }
        }
      }

      if manager == nil {
        manager = NETunnelProviderManager()
      }

      self.currentManager = manager
      self.status = manager!.connection.status
      completionHandler?(nil)
    }
  }

  private func disconnect() {
    configureVPN(
      { (manager) in
        return nil
      },
      completionHandler: { (error) in
        self.currentManager?.connection.stopVPNTunnel()
      })
  }

  private func assignConfigurationParams(c: OpenVPN.Configuration) {
    sessionBuilder.hostname = c.hostname
    sessionBuilder.cipher = c.cipher
    sessionBuilder.digest = c.digest
    sessionBuilder.compressionFraming = c.compressionFraming
    sessionBuilder.compressionAlgorithm = c.compressionAlgorithm
    sessionBuilder.ca = c.ca
    sessionBuilder.clientCertificate = c.clientCertificate
    sessionBuilder.clientKey = c.clientKey
    sessionBuilder.tlsWrap = c.tlsWrap
    sessionBuilder.tlsSecurityLevel = c.tlsSecurityLevel
    sessionBuilder.keepAliveInterval = c.keepAliveInterval
    sessionBuilder.keepAliveTimeout = c.keepAliveTimeout
    sessionBuilder.renegotiatesAfter = c.renegotiatesAfter
    sessionBuilder.endpointProtocols = c.endpointProtocols
    sessionBuilder.checksEKU = c.checksEKU
    sessionBuilder.randomizeEndpoint = c.randomizeEndpoint
    sessionBuilder.usesPIAPatches = c.usesPIAPatches
    sessionBuilder.authToken = c.authToken
    sessionBuilder.peerId = c.peerId
    sessionBuilder.ipv4 = c.ipv4
    sessionBuilder.ipv6 = c.ipv6
    sessionBuilder.dnsServers = c.dnsServers
    sessionBuilder.searchDomains = c.searchDomains
    sessionBuilder.httpProxy = c.httpProxy
    sessionBuilder.httpsProxy = c.httpsProxy
    sessionBuilder.proxyAutoConfigurationURL = c.proxyAutoConfigurationURL
    sessionBuilder.proxyBypassDomains = c.proxyBypassDomains
    sessionBuilder.routingPolicies = c.routingPolicies
  }

  @objc private func VPNStatusDidChange(notification: NSNotification) {
    guard let vpnStatus = currentManager?.connection.status else {
      sendEvent("VPNStatusDidChange", ["VPNStatus": ReadableConnectionStatus.unknown.rawValue])
      return
    }
    self.status = vpnStatus
    let statusDescription = vpnStatus.readableStatus.rawValue
    sendEvent("VPNStatusDidChange", ["VPNStatus": statusDescription])
    print("VPNStatusDidChange: \(statusDescription)")
  }

  @IBAction func displayLog() {
    guard let vpn = currentManager?.connection as? NETunnelProviderSession else {
      return
    }
    try? vpn.sendProviderMessage(OpenVPNTunnelProvider.Message.requestLog.data) { (data) in
      guard let data = data, let log = String(data: data, encoding: .utf8) else {
        return
      }
      print("Log: \(log)")
    }
  }

  // MARK: Module definition

  public func definition() -> ModuleDefinition {
    Name("ExpoTunnelkit")
    Events("VPNStatusDidChange")

    Function("setup") { (appGroup: String, tunnelIdentifier: String) in
      self.appGroup = appGroup
      self.tunnelIdentifier = tunnelIdentifier

      NotificationCenter.default.addObserver(
        self, selector: #selector(VPNStatusDidChange(notification:)),
        name: .NEVPNStatusDidChange, object: nil)

      return true
    }

    Function("setCredentials") { (username: String, password: String) in
      self.username = username
      self.password = password
      return true
    }

    Function("setParam") { (key: String, value: String) in
      switch key {
      // MARK: Credentials
      case "Username":
        self.username = value
      case "Password":
        self.password = value

      // MARK: TunnelExtension

      case "AppGroup":
        self.appGroup = value

      case "TunnelIdentifier":
        self.tunnelIdentifier = value

      // MARK: SessionConfiguration
      case "Hostname":
        self.sessionBuilder.hostname = value

      case "CipherAlgorithm":
        var cipher: OpenVPN.Cipher?
        switch value {
        case "AES-128-CBC":
          cipher = .aes128cbc
        case "AES-192-CBC":
          cipher = .aes192cbc
        case "AES-256-CBC":
          cipher = .aes256cbc
        case "AES-128-GCM":
          cipher = .aes128gcm
        case "AES-192-GCM":
          cipher = .aes192gcm
        case "AES-256-GCM":
          cipher = .aes256gcm
        default:
          break
        }
        sessionBuilder.cipher = cipher

      case "DigestAlgorithm":
        var digest: OpenVPN.Digest?
        switch value {
        case "SHA1":
          digest = .sha1
        case "SHA256":
          digest = .sha256
        case "SHA384":
          digest = .sha384
        case "SHA512":
          digest = .sha512
        default:
          break
        }
        sessionBuilder.digest = digest

      case "CompressionFraming":
        var compressionFraming: OpenVPN.CompressionFraming?
        switch value {
        case "disabled":
          compressionFraming = .disabled
        case "compLZO":
          compressionFraming = .compLZO
        case "compress":
          compressionFraming = .compress
        default:
          break
        }
        sessionBuilder.compressionFraming = compressionFraming

      case "CompressionAlgorithm":
        var compressionAlgorithm: OpenVPN.CompressionAlgorithm?
        switch value {
        case "disabled":
          compressionAlgorithm = .disabled
        case "LZO":
          compressionAlgorithm = .LZO
        case "other":
          compressionAlgorithm = .other
        default:
          break
        }
        sessionBuilder.compressionAlgorithm = compressionAlgorithm

      case "CA":
        sessionBuilder.ca = OpenVPN.CryptoContainer(pem: value)

      case "ClientCertificate":
        sessionBuilder.clientCertificate = OpenVPN.CryptoContainer(pem: value)

      case "ClientKey":
        sessionBuilder.clientKey = OpenVPN.CryptoContainer(pem: value)

      case "TLSWrapStrategy":
        switch value {
        case "auth":
          self.tlsWrapStrategy = .auth
        case "crypt":
          self.tlsWrapStrategy = .crypt
        default:
          break
        }
        self.setTlsWrap()

      case "TLSWrapKeyData":
        self.tlsWrapKeyData = Data(value.data(using: .utf8)!)
        self.setTlsWrap()

      case "TLSWrapKeyDirection":
        switch value {
        case "0":
          self.tlsWrapKeyDirection = .init(rawValue: 0)
        case "1":
          self.tlsWrapKeyDirection = .init(rawValue: 1)
        default:
          self.tlsWrapKeyDirection = nil
        }
        self.setTlsWrap()

      case "TLSSecurityLevel":
        sessionBuilder.tlsSecurityLevel = Int(value) ?? 0

      case "KeepAliveInterval":
        sessionBuilder.keepAliveInterval = Double(value)

      case "KeepAliveTimeout":
        sessionBuilder.keepAliveTimeout = Double(value)

      case "RenegotiatesAfter":
        sessionBuilder.renegotiatesAfter = Double(value)

      case "SocketType":
        switch value {
        case "TCP":
          self.socketType = SocketType.tcp
        case "UDP":
          self.socketType = .udp
        default:
          break
        }
        self.setEndpointProtocol()

      case "Port":
        self.port = UInt16(value)
        self.setEndpointProtocol()

      case "ChecksEKU":
        switch value {
        case "true":
          sessionBuilder.checksEKU = true
        case "false":
          sessionBuilder.checksEKU = false
        default:
          break
        }

      case "RandomizeEndpoint":
        switch value {
        case "true":
          sessionBuilder.randomizeEndpoint = true
        case "false":
          sessionBuilder.randomizeEndpoint = false
        default:
          break
        }

      case "UsesPIAPatches":
        switch value {
        case "true":
          sessionBuilder.usesPIAPatches = true
        case "false":
          sessionBuilder.usesPIAPatches = false
        default:
          break
        }

      case "AuthToken":
        sessionBuilder.authToken = value

      case "PeerID":
        sessionBuilder.peerId = UInt32(value)

      case "IPv4Settings":
        sessionBuilder.ipv4 = try JSONDecoder().decode(
          IPv4Settings.self, from: value.data(using: .utf8)!)

      case "IPv6Settings":
        sessionBuilder.ipv6 = try JSONDecoder().decode(
          IPv6Settings.self, from: value.data(using: .utf8)!)

      case "DNSServers":
        sessionBuilder.dnsServers = try JSONDecoder().decode(
          [String].self, from: value.data(using: .utf8)!)

      case "SearchDomains":
        sessionBuilder.searchDomains = try JSONDecoder().decode(
          [String].self, from: value.data(using: .utf8)!)

      case "HTTPProxy":
        sessionBuilder.httpProxy = try JSONDecoder().decode(
          Proxy.self, from: value.data(using: .utf8)!)

      case "HTTPSProxy":
        sessionBuilder.httpsProxy = try JSONDecoder().decode(
          Proxy.self, from: value.data(using: .utf8)!)

      case "ProxyAutoConfigurationURL":
        sessionBuilder.proxyAutoConfigurationURL = URL(string: value)

      case "ProxyBypassDomains":
        sessionBuilder.proxyBypassDomains = try JSONDecoder().decode(
          [String].self, from: value.data(using: .utf8)!)

      case "RoutingPolicies":
        sessionBuilder.routingPolicies = try JSONDecoder().decode(
          [OpenVPN.RoutingPolicy].self, from: value.data(using: .utf8)!)

      // MARK: Customization
      case "PrefersResolvedAddresses":
        switch value {
        case "true":
          self.tunnelProviderSettings.prefersResolvedAddresses = true
        case "false":
          self.tunnelProviderSettings.prefersResolvedAddresses = false
        default:
          break
        }

      case "ResolvedAddresses":
        self.tunnelProviderSettings.resolvedAddresses = try JSONDecoder().decode(
          [String].self, from: value.data(using: .utf8)!)

      case "MTU":
        self.tunnelProviderSettings.mtu = Int(value)

      // MARK: Debugging
      case "Debug":
        switch value {
        case "true":
          self.tunnelProviderSettings.shouldDebug = true
        case "false":
          self.tunnelProviderSettings.shouldDebug = false
        default:
          break
        }

      case "DebugLogFormat":
        self.tunnelProviderSettings.debugLogFormat = value

      case "MasksPrivateData":
        switch value {
        case "true":
          self.tunnelProviderSettings.masksPrivateData = true
        case "false":
          self.tunnelProviderSettings.masksPrivateData = false
        default:
          break
        }

      case "DataCountInterval":
        self.dataCountInterval = Int(value) ?? 1000

      default:
        return false
      }
      return true
    }

    AsyncFunction("configFromUrl") { (url: String, passphrase: String?, promise: Promise) in
      guard let url = URL(string: url) else {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description: "Invalid URL"
          ))
        return
      }

      do {
        let config = try OpenVPN.ConfigurationParser.parsed(fromURL: url, passphrase: passphrase)
        self.builtSession = config.configuration
        assignConfigurationParams(c: config.configuration)
        promise.resolve(true)
      } catch let e {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description: "Error parsing configuration: \(e)"
          ))
      }
    }

    AsyncFunction("configFromString") { (str: String, passphrase: String?, promise: Promise) in
      do {
        let lines = str.split(separator: "\n").map { String($0) }
        let config = try OpenVPN.ConfigurationParser.parsed(
          fromLines: lines, isClient: false, passphrase: passphrase)
        self.builtSession = config.configuration
        print("config: \(config.configuration)")
        assignConfigurationParams(c: config.configuration)
        promise.resolve(true)
      } catch let e {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description: "Error parsing configuration: \(e)"
          ))
      }
    }

    AsyncFunction("build") { (promise: Promise) in
      self.builtSession = self.sessionBuilder.build()
      promise.resolve(true)
    }

    AsyncFunction("getVpnStatus") { (promise: Promise) in
      promise.resolve(self.status.readableStatus.rawValue)
    }

    AsyncFunction("connect") { (promise: Promise) in
      guard let username = self.username, let password = self.password,
        let hostname = self.sessionBuilder.hostname
      else {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description:
              "Missing required VPN parameters (username, password, or hostname)."
          ))
        return
      }
      guard let appGroup = self.appGroup, let tunnelIdentifier = self.tunnelIdentifier else {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description: "AppGroup and TunnelIdentifier must be set"
          ))
        return
      }

      let block = {
        switch self.status {
        case .invalid, .disconnected:
          self.configureVPN(
            { (manager) in
              return self.makeProtocol()
            },
            completionHandler: { (error) in
              if let error = error {
                promise.reject(
                  Exception(
                    name: "ExpoTunnelkitModuleError",
                    description: "configure error: \(error)"
                  ))
                print("configure error: \(error)")
                return
              }
              guard let session = self.currentManager?.connection as? NETunnelProviderSession else {
                promise.reject(
                  Exception(
                    name: "ExpoTunnelkitModuleError",
                    description: "Failed to get session"
                  ))
                return
              }
              do {
                try session.startTunnel()
                promise.resolve(true)
              } catch let e {
                print("error starting tunnel: \(e)")
                promise.reject(
                  Exception(
                    name: "ExpoTunnelkitModuleError",
                    description: "Error starting tunnel: \(e)"
                  ))
              }
            })

        case .connected, .connecting:
          self.disconnect()

        default:
          break
        }
      }

      if status == .invalid {
        reloadCurrentManager({ (error) in
          block()
        })
      } else {
        block()
      }
    }

    AsyncFunction("disconnect") { (promise: Promise) in
      self.disconnect()
      promise.resolve(true)
    }

    AsyncFunction("getCurrentConfig") { (promise: Promise) in
      let config = self.sessionBuilder
      var result = [String: Any]()
      result["Hostname"] = config.hostname
      result["CipherAlgorithm"] = config.cipher?.rawValue
      result["DigestAlgorithm"] = config.digest?.rawValue
      result["CompressionFraming"] = config.compressionFraming?.rawValue
      result["CompressionAlgorithm"] = config.compressionAlgorithm?.rawValue
      result["CA"] = config.ca?.pem
      result["ClientCertificate"] = config.clientCertificate?.pem
      result["ClientKey"] = config.clientKey?.pem
      result["TLSWrapStrategy"] = config.tlsWrap?.strategy.rawValue
      result["TLSWrapKeyData"] = config.tlsWrap?.key
      //        result["TLSWrapKeyDirection"] = config.tlsWrap?.key.direction?.rawValue
      result["TLSSecurityLevel"] = config.tlsSecurityLevel
      result["KeepAliveInterval"] = config.keepAliveInterval
      result["KeepAliveTimeout"] = config.keepAliveTimeout
      result["RenegotiatesAfter"] = config.renegotiatesAfter
      result["SocketType"] = config.endpointProtocols?.first?.socketType.rawValue
      result["Port"] = config.endpointProtocols?.first?.port
      result["ChecksEKU"] = config.checksEKU
      result["RandomizeEndpoint"] = config.randomizeEndpoint
      result["UsesPIAPatches"] = config.usesPIAPatches
      result["AuthToken"] = config.authToken
      result["PeerID"] = config.peerId
      result["IPv4Settings"] = config.ipv4
      result["IPv6Settings"] = config.ipv6
      result["DNSServers"] = config.dnsServers
      result["SearchDomains"] = config.searchDomains
      result["HTTPProxy"] = config.httpProxy
      result["HTTPSProxy"] = config.httpsProxy
      result["ProxyAutoConfigurationURL"] = config.proxyAutoConfigurationURL?.absoluteString
      result["ProxyBypassDomains"] = config.proxyBypassDomains
      result["RoutingPolicies"] = config.routingPolicies
      promise.resolve(result)
    }

    AsyncFunction("getDataCount") { (promise: Promise) in
      guard let appGroup = self.appGroup,
        let configuration = self.openVPNTunnelProviderConfiguration
      else {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description: "Connection is not established"
          ))
        return
      }
      guard let dataCount = configuration.dataCount(in: appGroup) else {
        promise.reject(
          Exception(
            name: "ExpoTunnelkitModuleError",
            description: "Failed to get data count"
          ))
        return
      }
      let response = [
        "dataIn": UInt64(dataCount.0),
        "dataOut": UInt64(dataCount.1),
        "interval": self.dataCountInterval,
      ]
      promise.resolve(response)
    }
  }

}
