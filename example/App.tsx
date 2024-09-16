import ExpoTunnelkit, { VpnStatus } from 'expo-tunnelkit';
import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';

import { ovpnConfig } from './ovpn-config';

export default function App() {
  const [status, setStatus] = useState<VpnStatus>('Unknown');
  const [ready, setReady] = useState(false);
  const [dataCount, setDataCount] = useState({ dataIn: 0, dataOut: 0 });
  const [logs, setLogs] = useState('');

  const init = useCallback(async () => {
    ExpoTunnelkit.setup();
    ExpoTunnelkit.setCredentials('test', 'testtest2');
    await ExpoTunnelkit.configFromString(ovpnConfig);
    ExpoTunnelkit.setParam('Debug', true);
    setReady(true);
  }, []);

  useEffect(() => {
    const subscription = ExpoTunnelkit.addVpnStatusListener((status) => {
      console.log('Current status', status);
      setStatus(status.VPNStatus);
    });
    const interval = setInterval(() => {
      ExpoTunnelkit.getDataCount().then((data) => {
        setDataCount(data);
      });
    }, 1000);

    setTimeout(() => {
      ExpoTunnelkit.getVpnLogs().then((logs) => {
        setLogs(logs);
      });
    }, 5000);

    init();
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const handleConnect = useCallback(() => {
    ExpoTunnelkit.connect()
      .then((status) => {
        console.log('Connect status (promise)', status);
      })
      .catch((error) => {
        console.log('Connect error (promise)', error);
      })
      .finally(() => {
        ExpoTunnelkit.getVpnLogs().then((logs) => {
          console.log('Logs', logs);
          setLogs(logs);
        });
      });
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
        <Button title="🌍 Connect" onPress={handleConnect} disabled={!ready} />
        <View style={{ width: 1, backgroundColor: 'black' }} />
        <Button
          title="❌ Disconnect"
          onPress={() => ExpoTunnelkit.disconnect()}
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
      <ScrollView>
        <Text style={{ fontSize: 20, fontWeight: 700 }}>Logs:</Text>
        <Text>{logs.split(`\n`).toReversed()}</Text>
      </ScrollView>
    </View>
  );
}
