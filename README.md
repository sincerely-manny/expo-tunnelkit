# expo-tunnelkit

Expo module/wrapper for TunnelKit VPN client library for Apple platforms. Built on top of PIA's [fork](https://github.com/pia-foss/mobile-ios-openvpn) of TunnelKit. Expo config plugin sets up Xcode project settings for you so you can simply import the module and use it's API.

# Installation in managed Expo projects

No. Use bare workflow.

```shell
npx expo prebuild
```

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

**❗️Make sure you have committed all changes before installing the package ❗️**

### Install npm package

```shell
npx expo install expo-tunnelkit
```

### Make sure that config plugin was added to your `app.json`

```json
{
  "expo": {
    "plugins": ["expo-tunnelkit"]
  }
}
```

### Run prebuild to configure Xcode project

```shell
npx expo prebuild
```

### Install pods

```shell
npx pod-install
```

### Make sure that build identifiers and app groups are set up correctly

The configuration plugin will add a new target named `TunnelKitNetworkExtension` to your Xcode project and set it up. Check that:

- `TunnelKitNetworkExtension` target has the same bundle identifier as your main app target with `.TunnelKitNetworkExtension` suffix.
- `TunnelKitNetworkExtension` target has the same app group as your main app target.
- Keychain sharing is enabled for both targets and app group is added to keychain sharing entitlements.

#### ❗️ Don't forget to set appropriate development team for the new target.

#### Now app should build and run correctly. You can import the module and use it's API.

# API

## Quick Start

```typescript
import ExpoTunnelkit from 'expo-tunnelkit';

// Setup app group and tunnel identifier
ExpoTunnelkit.setup();
// Set VPN credentials
ExpoTunnelkit.setCredentials('username', 'password');
// Add VPN status listener
const subscription = ExpoTunnelkit.addVpnStatusListener((status) =>
  console.log('Current status', status.VPNStatus),
);
// Set VPN connection parameters
await ExpoTunnelkit.configFromString(ovpnConfigFileContent);
// Set additional parameters as needed
ExpoTunnelkit.setParam('Hostname', 'example.com');
// Connect to the VPN server
await ExpoTunnelkit.connect();
// Disconnect from the VPN server
await ExpoTunnelkit.disconnect();
// Remove VPN status listener
subscription.remove();
```

## Methods

### `ExpoTunnelkit.setup`

```typescript
function setup(options?: SetupOptions): void;

type SetupOptions = {
  appGroup?: string; // Group identifier shared between the app and the app extension.
  tunnelIdentifier?: string; // Identifier of the network extension.
};
```

Setup VPN module with appGroup and tunnelIdentifier. This method should be called before any other VPN module methods. If options are not provided, the appGroup and tunnelIdentifier will be set to the default values based on the app's bundle identifier set in app.json (In most cases you don't need to provide any options).

**Returns** void.

### `ExpoTunnelkit.setCredentials`

```typescript
function setCredentials(username: string, password: string): void;
```

Set the VPN credentials.

**Returns** void.

### `ExpoTunnelkit.setParam`

```typescript
function setParam<T extends keyof SessionBuilder>(
  key: T, // a parameter to be set
  value: SessionBuilder[T], // a value to be set
): void;
```

Set VPN connection parameter. The parameters must be set before the VPN connection is established. You can set parameters manually or use `configFromUrl`/`configFromString` to set them from a configuration file. Parameters set manually after importing configuration from a file will override the parameters set from the file. See `SessionBuilder` for the list of available parameters.

**Returns** void.

### `ExpoTunnelkit.configFromUrl`

```typescript
async function configFromUrl(
  url: string, // URL of the configuration file
  passphrase?: string, // The optional passphrase for encrypted data.
): Promise<void>;
```

Configure VPN connection from an .ovpn configuration file. You can modify set parameters using `setParam` method after importing the configuration.

**Returns** Promise that resolves if the configuration was set successfully, rejects with an error otherwise.

### `ExpoTunnelkit.configFromString`

```typescript
async function configFromString(
  config: string, // configuration string (.ovpn file content)
  passphrase?: string, // The optional passphrase for encrypted data.
): Promise<void>;
```

Configure VPN connection from a configuration string (.ovpn file content). You can modify set parameters using `setParam` method after importing the configuration.

**Returns** Promise that resolves if the configuration was set successfully, rejects with an error otherwise.

### `ExpoTunnelkit.getConnectionStatus`

```typescript
async function getConnectionStatus(): Promise<VpnStatus>;

type VpnStatus =
  | 'Invalid'
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Reasserting'
  | 'Disconnecting'
  | 'None'
  | 'Unknown';
```

Get current VPN connection status.

**Returns** Promise that resolves to the current `VpnStatus`.

### `ExpoTunnelkit.connect`

```typescript
async function connect(): Promise<void>;
```

Connect to the VPN server. Session parameters must be set before calling this method. Keep in mind that resolved promise does not always mean that the connection was successful because the connection status can change after the promise is resolved (e.g. connection was established and then immediately dropped by server or client). Use `addVpnStatusListener` to get the current connection status.

**Returns** Promise that resolves if the connection was successful, rejects with an error otherwise.

### `ExpoTunnelkit.disconnect`

```typescript
async function disconnect(timeout = 7000): Promise<void>;
```

Disconnect from the VPN server.

**Parameters** `timeout` - disconnection timeout in milliseconds.

**Returns** Promise that resolves if the disconnection was successful, rejects with an error otherwise.

### `ExpoTunnelkit.addVpnStatusListener`

```typescript
function addVpnStatusListener(
  listener: (state: {
    VPNStatus: VpnStatus;
    Error?: VpnError[keyof VpnError];
  }) => void,
): Subscription;

type Subscription = {
  remove: () => void;
};

type VpnStatus =
  | 'Invalid'
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Reasserting'
  | 'Disconnecting'
  | 'None'
  | 'Unknown';

const ExpoTunnelkitError = {
  dnsFailure: 'Socket endpoint could not be resolved.',
  exhaustedProtocols: 'No more protocols available to try.',
  socketActivity: 'Socket failed to reach active state.',
  authentication: 'Credentials authentication failed.',
  tlsInitialization:
    'TLS could not be initialized (e.g. malformed CA or client PEMs).',
  tlsServerVerification: 'TLS server verification failed.',
  tlsHandshake: 'TLS handshake failed.',
  encryptionInitialization:
    'The encryption logic could not be initialized (e.g. PRNG, algorithms).',
  encryptionData: 'Data encryption/decryption failed.',
  lzo: 'The LZO engine failed.',
  serverCompression: 'Server uses an unsupported compression algorithm.',
  timeout: 'Tunnel timed out.',
  linkError: 'An error occurred at the link level.',
  routing: 'Network routing information is missing or incomplete.',
  networkChanged:
    'The current network changed (e.g. switched from WiFi to data connection).',
  gatewayUnattainable: 'Default gateway could not be attained.',
  unexpectedReply: 'The server replied in an unexpected way.',
} as const;
```

Add a listener to VPN status changes.

**Returns** `Subscription` object that can be used to unsubscribe the listener.

### `ExpoTunnelkit.getCurrentConfig`

```typescript
function getCurrentConfig(): Promise<Record<keyof SessionBuilder, string>>;
```

Get the current VPN connection configuration. Useful for debugging.

**Returns** Promise that resolves to the current `SessionBuilder` configuration.

### `ExpoTunnelkit.getDataCount`

```typescript
function getDataCount(): Promise<VpnDataCount>;

type VpnDataCount = {
  dataIn: number;
  dataOut: number;
  interval: number;
};
```

Get the amount of data transferred over the VPN connection during current session (in bytes). `dataIn` is the amount of data received, `dataOut` is the amount of data sent, `interval` is the time interval between internal data count updates (in milliseconds).

Data count interval is set to 1 second by default. You can change it by setting `DataCountInterval` parameter (in milliseconds) using `setParam` method. Setting it to 0 will disable data count checks.

```typescript
ExpoTunnelkit.setParam('DataCountInterval', 1000);
```

**Returns** Promise that resolves to the `VpnDataCount` object.

### `ExpoTunnelkit.getVpnLogs`

```typescript
async function getVpnLogs(): Promise<string>;
```

Get the last VPN logs. To start collecting logs, you need to set the `Debug` parameter to `true`.

```typescript
setParam('Debug', true);
```

**Returns** Promise that resolves to the last VPN logs.

## Types

### `SessionBuilder`

```typescript
type SessionBuilder = {
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
```

### `VpnStatus`

```typescript
type VpnStatus =
  | 'Invalid'
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Reasserting'
  | 'Disconnecting'
  | 'None'
  | 'Unknown';
```

### `VpnDataCount`

```typescript
type VpnDataCount = {
  dataIn: number;
  dataOut: number;
  interval: number;
};
```

### `Cipher`

```typescript
type Cipher =
  | 'AES-128-CBC'
  | 'AES-192-CBC'
  | 'AES-256-CBC'
  | 'AES-128-GCM'
  | 'AES-192-GCM'
  | 'AES-256-GCM';
```

### `Digest`

```typescript
type Digest = 'SHA1' | 'SHA256' | 'SHA384' | 'SHA512';
```

### `CompressionFraming`

```typescript
type CompressionFraming = 'disabled' | 'compLZO' | 'compress';
```

### `CompressionAlgorithm`

```typescript
type CompressionAlgorithm = 'disabled' | 'LZO' | 'other';
```

### `TLSWrapStrategy`

```typescript
type TLSWrapStrategy = 'auth' | 'crypt';
```

### `SocketType`

```typescript
type SocketType = 'TCP' | 'UDP';
```

### `RoutingPolicy`

```typescript
type RoutingPolicy = 'IPv4' | 'IPv6' | 'blockLocal';
```

### `Route`

```typescript
type Route = {
  destination: string;
  mask: string;
  gateway: string;
};
```

### `IPv4Settings`

```typescript
type IPv4Settings = {
  address: string;
  addressMask: string;
  defaultGateway: string;
  routes: Route[];
};
```

### `IPv6Settings`

```typescript
type IPv6Settings = {
  address: string;
  addressPrefixLength: number;
  defaultGateway: string;
  routes: Route[];
};
```

### `Proxy`

```typescript
type Proxy = {
  address: string;
  port: number;
};
```

## Contributing

Clone the repository and install dependencies:

```shell
git clone https://github.com/sincerely-manny/expo-tunnelkit.git
cd expo-tunnelkit
npm install
```

At the root of the project run build scripts to compile the TypeScript code for the module and configuration plugin:

```shell
npm run build
npm run build plugin
```

Prebuild the example app:

```shell
cd example
npx expo prebuild --clean
```

Run the example app:

```shell
npm run ios
```

To debug VPN client you can set up a local VPN server using [this](https://openvpn.net/as-docs/docker.html#run-the-docker-container) guide. It's worth mentioning that by default the server uses tls-crypt-v2 which is **not supported** by the client. After starting up docker container go to admin panel and create a new profile **without tls-crypt-v2.**

Fix all the buggs, add new features, create a pull request.
Drink water, listen to your mom, and don't forget to go out and touch some grass from time to time.

## Known issues

- tls-crypt-v2 is not supported. If you're willing to implement it, it's recommended to start from [here](https://github.com/sincerely-manny/expo-tunnelkit/blob/main/vendor/tunnelkit/TunnelKit/Sources/Protocols/OpenVPN/ConfigurationParser.swift)
