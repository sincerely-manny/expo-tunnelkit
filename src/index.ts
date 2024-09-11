import Constants from 'expo-constants';

import type {
  SessionBuilder,
  VpnDataCount,
  VpnStatus,
} from './ExpoTunnelkit.types';
import {
  ExpoTunnelkitEmitter,
  ExpoTunnelkitModule,
} from './ExpoTunnelkitModule';

const NETWORK_EXTENSION_TARGET_NAME = 'TunnelKitNetworkExtension';

type SetupOptions = {
  appGroup?: string;
  tunnelIdentifier?: string;
};
/**
 * Setup VPN module with appGroup and tunnelIdentifier. This method should be called before any other VPN module methods.
 * If options are not provided, the appGroup and tunnelIdentifier will be set to the default values based on the app's bundle identifier set in app.json.
 * @param {SetupOptions} options - The setup options.
 * @param {string} [options.appGroup] - Group identifier shared between the app and the app extension.
 * @param {string} [options.tunnelIdentifier] - Identifier of the network extension.
 *
 * @example
 * // Example usage:
 * setup({
 *  appGroup: 'group.com.example.app.tunnel',
 *  tunnelIdentifier: 'com.example.app.tunnelExtension',
 * });
 */
function setup(options?: SetupOptions): void {
  const bundle =
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.manifest.ios.bundleIdentifier;
  const appGroup =
    options?.appGroup ?? `group.${bundle}.${NETWORK_EXTENSION_TARGET_NAME}`;
  const tunnelIdentifier =
    options?.tunnelIdentifier ?? `${bundle}.${NETWORK_EXTENSION_TARGET_NAME}`;
  if (!appGroup || !tunnelIdentifier) {
    throw new Error(
      'appGroup and tunnelIdentifier must be provided or set in app.json',
    );
  }
  ExpoTunnelkitModule.setup(appGroup, tunnelIdentifier);
}

/**
 * Set the VPN credentials
 * @param username
 * @param password
 */
function setCredentials(username: string, password: string): void {
  ExpoTunnelkitModule.setCredentials(username, password);
}

/**
 * Set VPN connection parameter. The parameters must be set before the VPN connection is established.
 * You can set parameters manually or use `configFromUrl`/`configFromString` to set them from a configuration file.
 * Parameters set manually after importing configuration from a file will override the parameters set from the file.
 * @see configFromUrl
 * @see configFromString
 * @param key a parameter to be set
 * @param value a value to be set
 * @see SessionBuilder for the list of available parameters
 * @example await setParam('Hostname', 'example.com');
 * @example await setParam('Port', 443);
 * @example await setParam('SocketType', 'TCP');
 */
function setParam<T extends keyof SessionBuilder>(
  key: T,
  value: SessionBuilder[T],
): void {
  const v =
    typeof value === 'object' || typeof value === 'boolean'
      ? JSON.stringify(value)
      : value;

  if (!ExpoTunnelkitModule.setParam(key, v)) {
    throw new Error(`Unknown parameter: ${key}`);
  }
}

/**
 * Configure VPN connection from an .ovpn configuration file.
 * You can modify set parameters using `setParam` method after importing the configuration.
 * @param url URL of the configuration file
 * @param passphrase The optional passphrase for encrypted data.
 * @deprecated Not tested properly. Use `configFromString` instead.
 */
async function configFromUrl(url: string, passphrase?: string): Promise<void> {
  await ExpoTunnelkitModule.configFromUrl(url, passphrase);
}

/**
 * Configure VPN connection from a configuration string (.ovpn file content).
 * You can modify set parameters using `setParam` method after importing the configuration.
 * @param config configuration string
 * @param passphrase The optional passphrase for encrypted data.
 */
async function configFromString(
  config: string,
  passphrase?: string,
): Promise<void> {
  await ExpoTunnelkitModule.configFromString(config, passphrase);
}

/**
 * Get current VPN connection status.
 * Possible statuses are: 'Invalid' | 'Disconnected' | 'Connecting' | 'Connected' | 'Reasserting' | 'Disconnecting' | 'None' | 'Unknown'
 * @returns Promise that resolves to the current `VpnStatus`
 * @example const status = await getVpnStatus();
 */
async function getConnectionStatus() {
  const status = (await ExpoTunnelkitModule.getVpnStatus()) as VpnStatus;
  return status;
}

/**
 * Connect to the VPN server. Sessin parameters must be set before calling this method.
 * @param timeout a timeout of the connection in milliseconds
 * @returns Promise that resolves if the connection was successful, rejects with an error otherwise
 * @example const connected = await connect();
 */
async function connect(timeout = 7000): Promise<void> {
  try {
    await ExpoTunnelkitModule.connect();

    await Promise.race([
      new Promise((reject) =>
        setTimeout(() => reject(new Error('Connection timed out')), timeout),
      ),
      new Promise<void>((resolve) => {
        const listener = addVpnStatusListener((state) => {
          if (state.VPNStatus === 'Connected') {
            listener.remove();
            resolve();
          }
        });
      }),
    ]);
  } catch (e) {
    // disconnect in case of error and if some connection process is still running
    disconnect().catch(() => {});
    throw e;
  }
}

/**
 * Disconnect from the VPN server.
 * @param timeout a timeout of the disconnection in milliseconds
 * @returns Promise that resolves if the disconnection was successful, rejects with an error otherwise
 * @example const disconnected = await disconnect();
 */
async function disconnect(timeout = 7000): Promise<void> {
  await ExpoTunnelkitModule.disconnect();

  await Promise.race([
    new Promise((reject) =>
      setTimeout(() => reject(new Error('Disconnection timed out')), timeout),
    ),
    new Promise<void>((resolve) => {
      const listener = addVpnStatusListener((state) => {
        if (state.VPNStatus === 'Disconnected') {
          listener.remove();
          resolve();
        }
      });
    }),
  ]);
}

/**
 * Add a listener to VPN status changes.
 * @param listener a function that will be called when the VPN status changes
 * @returns `Subscription` object that can be used to unsubscribe the listener
 * @example addVpnStatusListener((state) => console.log(state.VPNStatus));
 */
function addVpnStatusListener(
  listener: (state: { VPNStatus: VpnStatus }) => void,
) {
  return ExpoTunnelkitEmitter.addListener('VPNStatusDidChange', listener);
}

/**
 * Get the current VPN connection configuration. Useful for debugging.
 * @returns Promise that resolves to the current `SessionBuilder` configuration
 * @example const config = await getCurrentConfig();
 */
function getCurrentConfig(): Promise<Record<keyof SessionBuilder, string>> {
  return ExpoTunnelkitModule.getCurrentConfig();
}

/**
 * Get the current VPN connection (sessin) data count.
 * @returns Promise that resolves to the current `VpnDataCount` object, rejects with an error if the data count is not available
 *
 * `dataIn` - the number of bytes received
 *
 * `dataOut` - the number of bytes sent
 *
 * `interval` - the interval in milliseconds between data count updates
 * @example const dataCount = await getDataCount();
 */
function getDataCount(): Promise<VpnDataCount> {
  return ExpoTunnelkitModule.getDataCount();
}

/**
 * VPN module methods wrapper.
 * @example // Setup app group and tunnel identifier
 * ExpoTunnelkit.setup('group.com.example.app.tunnel', 'com.example.app.tunnelExtension');
 * // Set VPN credentials
 * ExpoTunnelkit.setCredentials('username', 'password');
 * // Add VPN status listener
 * const subscription = ExpoTunnelkit.addVpnStatusListener((status) => console.log('Current status', status.VPNStatus));
 * // Set VPN connection parameters
 * await ExpoTunnelkit.configFromUrl('https://example.com/config.ovpn');
 * ExpoTunnelkit.setParam('Hostname', 'example.com');
 * // Connect to the VPN server
 * await ExpoTunnelkit.connect();
 * // Disconnect from the VPN server
 * await ExpoTunnelkit.disconnect();
 * // Remove VPN status listener
 * subscription.remove();
 */
const ExpoTunnelkit = {
  setup,
  setCredentials,
  setParam,
  configFromUrl,
  configFromString,
  getConnectionStatus,
  connect,
  disconnect,
  addVpnStatusListener,
  getCurrentConfig,
  getDataCount,
};

export default ExpoTunnelkit;

export type { SessionBuilder, VpnStatus, VpnDataCount };
