import { ExpoTunnelkitError } from './ExpoTunnelkit.errors';

type Cipher =
  | 'AES-128-CBC'
  | 'AES-192-CBC'
  | 'AES-256-CBC'
  | 'AES-128-GCM'
  | 'AES-192-GCM'
  | 'AES-256-GCM';
type Digest = 'SHA1' | 'SHA256' | 'SHA384' | 'SHA512';
type CompressionFraming = 'disabled' | 'compLZO' | 'compress';
type CompressionAlgorithm = 'disabled' | 'LZO' | 'other';
type TLSWrapStrategy = 'auth' | 'crypt';
type SocketType = 'TCP' | 'UDP';
type RoutingPolicy = 'IPv4' | 'IPv6' | 'blockLocal';

type Route = {
  destination: string;
  mask: string;
  gateway: string;
};

type IPv4Settings = {
  address: string;
  addressMask: string;
  defaultGateway: string;
  routes: Route[];
};

type IPv6Settings = {
  address: string;
  addressPrefixLength: number;
  defaultGateway: string;
  routes: Route[];
};

type Proxy = {
  address: string;
  port: number;
};

export type SessionBuilder = {
  Username: string;
  Password: string;
  AppGroup: string;
  TunnelIdentifier: string;
  Hostname: string;
  CipherAlgorithm: Cipher;
  DigestAlgorithm: Digest;
  CompressionFraming: CompressionFraming;
  CompressionAlgorithm: CompressionAlgorithm;
  CA: string;
  ClientCertificate: string;
  ClientKey: string;
  TLSWrapStrategy: TLSWrapStrategy;
  TLSWrapKeyData: string;
  TLSWrapKeyDirection: 0 | 1 | null;
  TLSSecurityLevel: number;
  KeepAliveInterval: number;
  KeepAliveTimeout: number;
  RenegotiatesAfter: number;
  SocketType: SocketType;
  Port: number;
  ChecksEKU: boolean;
  RandomizeEndpoint: boolean;
  UsesPIAPatches: boolean;
  AuthToken: string;
  PeerID: number;
  IPv4Settings: IPv4Settings;
  IPv6Settings: IPv6Settings;
  DNSServers: string[];
  SearchDomains: string[];
  HTTPProxy: Proxy;
  HTTPSProxy: Proxy;
  ProxyAutoConfigurationURL: string;
  ProxyBypassDomains: string[];
  RoutingPolicies: RoutingPolicy[];
  PrefersResolvedAddresses: boolean;
  ResolvedAddresses: string[];
  MTU: number;
  Debug: boolean;
  DebugLogFormat: string;
  MasksPrivateData: boolean;
  DataCountInterval: number; // milliseconds between data count updates (0 to disable, default 1000)
};

export type VpnStatus =
  | 'Invalid'
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Reasserting'
  | 'Disconnecting'
  | 'None'
  | 'Unknown';

export type VpnError = {
  [key in keyof typeof ExpoTunnelkitError]: (typeof ExpoTunnelkitError)[key];
};

export type VpnDataCount = {
  dataIn: number;
  dataOut: number;
  interval: number;
};
