import { StyleSheet, Text, View } from 'react-native';

import * as ExpoTunnelkit from 'expo-tunnelkit';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{ExpoTunnelkit.hello()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
