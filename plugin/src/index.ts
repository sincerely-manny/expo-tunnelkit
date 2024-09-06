import {
  ConfigPlugin,
  withDangerousMod,
  withEntitlementsPlist,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import { NETWORK_EXTENSION_TARGET_NAME } from './constants';

/**
 * Add "Network Extension -> Packet Tunnel Provider"
 */
const withNetworkExtensionCapabilities: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (newConfig) => {
    const KEY = 'com.apple.developer.networking.networkextension';
    if (!Array.isArray(newConfig.modResults[KEY])) {
      newConfig.modResults[KEY] = [];
    }
    if (!newConfig.modResults[KEY].includes('packet-tunnel-provider')) {
      newConfig.modResults[KEY].push('packet-tunnel-provider');
    }
    return newConfig;
  });
};

/**
 * Add App Group capability
 */
const withAppGroupCapabilities: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (newConfig) => {
    const KEY = 'com.apple.security.application-groups';
    if (!Array.isArray(newConfig.modResults[KEY])) {
      newConfig.modResults[KEY] = [];
    }
    const entitlement = `group.${newConfig?.ios?.bundleIdentifier || ''}.${NETWORK_EXTENSION_TARGET_NAME}`;
    if (!newConfig.modResults[KEY].includes(entitlement)) {
      newConfig.modResults[KEY].push(entitlement);
    }
    return newConfig;
  });
};

/**
 * Add "Keychain Sharing" capability and Keychain Access Groups
 */
const withKeychainSharingCapabilities: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (newConfig) => {
    const KEY = 'keychain-access-groups';
    if (!Array.isArray(newConfig.modResults[KEY])) {
      newConfig.modResults[KEY] = [];
    }
    const entitlement = `$(AppIdentifierPrefix)group.${newConfig?.ios?.bundleIdentifier || ''}.${NETWORK_EXTENSION_TARGET_NAME}`;
    if (!newConfig.modResults[KEY].includes(entitlement)) {
      newConfig.modResults[KEY].push(entitlement);
    }
    return newConfig;
  });
};

/**
 * Add Network Extension
 */
const withNetworkExtension: ConfigPlugin = (config) => {
  const modulePath = require.resolve('expo-tunnelkit');
  const extensionSourcePath = path.join(modulePath, 'extension-files');
  const files = fs.readdirSync(extensionSourcePath);
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = path.join(config.modRequest.projectRoot, 'ios');
      const extensionPath = path.join(iosPath, NETWORK_EXTENSION_TARGET_NAME);
      if (!fs.existsSync(extensionPath)) {
        fs.mkdirSync(extensionPath, { recursive: true });
      }
      for (const file of files) {
        const source = path.join(extensionSourcePath, file);
        const destination = path.join(extensionPath, file);
        if (!fs.existsSync(destination)) {
          try {
            fs.copyFileSync(source, destination);
            // Modify the file content to replace {{GROUP_NAME}} with the actual group name
            const content = fs.readFileSync(destination, 'utf8');
            const replacedContent = content.replace(
              /{{GROUP_NAME}}/gm,
              `group.${config?.ios?.bundleIdentifier || ''}.${NETWORK_EXTENSION_TARGET_NAME}`,
            );
            fs.writeFileSync(destination, replacedContent);
          } catch (e) {
            console.error(`Failed to copy ${source} to ${destination}`);
            console.error(e);
          }
        }
      }
      return config;
    },
  ]);
};

/**
 * Modify Podfile to include the Network Extension target and add the necessary dependencies
 */

/**
 * Add target to xcode project
 */

const withTunnelKit: ConfigPlugin = (config) => {
  config = withNetworkExtensionCapabilities(config);
  config = withAppGroupCapabilities(config);
  config = withKeychainSharingCapabilities(config);
  config = withNetworkExtension(config);
  return config;
};

export default withTunnelKit;
