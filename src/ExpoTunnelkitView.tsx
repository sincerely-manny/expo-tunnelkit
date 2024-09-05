import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExpoTunnelkitViewProps } from './ExpoTunnelkit.types';

const NativeView: React.ComponentType<ExpoTunnelkitViewProps> =
  requireNativeViewManager('ExpoTunnelkit');

export default function ExpoTunnelkitView(props: ExpoTunnelkitViewProps) {
  return <NativeView {...props} />;
}
