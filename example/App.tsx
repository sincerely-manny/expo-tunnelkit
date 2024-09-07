import ExpoTunnelkit, { VpnStatus } from 'expo-tunnelkit';
import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import { ovpnConfig } from './ovpn-config';

export default function App() {
  const [status, setStatus] = useState<VpnStatus>('Unknown');
  const [ready, setReady] = useState(false);

  const init = useCallback(async () => {
    ExpoTunnelkit.setup();
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
    <View style={{ paddingHorizontal: 20, paddingVertical: 100, gap: 20 }}>
      <Text>Demo</Text>
      <View
        style={{
          opacity: ready ? 1 : 0.5,
          flexDirection: 'row',
          gap: 8,
          alignContent: 'center',
          justifyContent: 'center',
        }}
      >
        <Button
          title="🌍 Connect"
          onPress={ExpoTunnelkit.connect}
          disabled={!ready}
        />
        <View style={{ width: 1, backgroundColor: 'black' }} />
        <Button
          title="❌ Disconnect"
          onPress={ExpoTunnelkit.disconnect}
          disabled={!ready}
        />
      </View>
      <View>
        <Text>
          {status === 'Connected'
            ? '🟢'
            : status === 'Disconnected'
              ? '🔴'
              : '🟡'}{' '}
          {status}
        </Text>
      </View>
    </View>
  );
}
