import ExpoTunnelkit, { VpnStatus } from 'expo-tunnelkit';
import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

import { ovpnConfig } from './ovpn-config';

export default function App() {
  const [status, setStatus] = useState<VpnStatus>('Unknown');
  const [ready, setReady] = useState(false);
  const [dataCount, setDataCount] = useState({ dataIn: 0, dataOut: 0 });

  const init = useCallback(async () => {
    ExpoTunnelkit.setup();
    ExpoTunnelkit.setCredentials('openvpn', 'k3Jbv5Lzbiaz');
    await ExpoTunnelkit.configFromString(ovpnConfig);
    ExpoTunnelkit.setParam('Hostname', '192.168.2.100');
    ExpoTunnelkit.setParam('UsesPIAPatches', true);
    setReady(true);
  }, []);

  useEffect(() => {
    const subscription = ExpoTunnelkit.addVpnStatusListener((status) => {
      console.log('Current status', status.VPNStatus);
      setStatus(status.VPNStatus);
    });
    const interval = setInterval(() => {
      ExpoTunnelkit.getDataCount()
        .then((data) => {
          console.log('Data count', data);
          setDataCount(data);
        })
        .catch((error) => {
          console.log('Error getting data count', error);
        });
    }, 1000);

    init();
    return () => {
      subscription.remove();
      clearInterval(interval);
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
        <Text>
          ⬇️ Recieved: {(dataCount.dataIn / 1e6).toFixed(2)} MB | ⬆️ Sent:
          {(dataCount.dataOut / 1e6).toFixed(2)} MB
        </Text>
      </View>
    </View>
  );
}
