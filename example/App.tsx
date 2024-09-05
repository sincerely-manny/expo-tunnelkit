import { ExpoTunnelkit } from 'expo-tunnelkit';
import { VpnStatus } from 'expo-tunnelkit/ExpoTunnelkit.types';
import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import { ovpnConfig } from './ovpn-config';

export default function App() {
  const [status, setStatus] = useState<VpnStatus>('Unknown');
  const [ready, setReady] = useState(false);

  const init = useCallback(async () => {
    ExpoTunnelkit.setup(
      'group.com.appstrain.ahvpn.VpnProvider',
      'com.appstrain.ahvpn.VpnProvider',
    );
    ExpoTunnelkit.setCredentials('freeopenvpn', '127461219');
    await ExpoTunnelkit.configFromString(ovpnConfig);
    setReady(true);
  }, []);

  useEffect(() => {
    const subscription = ExpoTunnelkit.addVpnStatusListener((status) => {
      console.log('Current status', status.VPNStatus);
      setStatus(status.VPNStatus);
    });
    init();
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View>
      <Text>Home</Text>
      <View
        style={{
          opacity: ready ? 1 : 0.5,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Button
          title="Connect"
          onPress={ExpoTunnelkit.connect}
          disabled={!ready}
        />
        <Button
          title="Disconnect"
          onPress={ExpoTunnelkit.disconnect}
          disabled={!ready}
        />
      </View>
      <View>
        <Text>
          {status === 'Connected' ? '🟢' : '🔴'} Status: {status}
        </Text>
      </View>
    </View>
  );
}
