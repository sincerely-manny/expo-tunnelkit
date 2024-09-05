import { EventEmitter, requireNativeModule } from 'expo-modules-core';

const ExpoTunnelkitModule = requireNativeModule('ExpoTunnelkit');
const ExpoTunnelkitEmitter = new EventEmitter(ExpoTunnelkitModule);

export { ExpoTunnelkitModule, ExpoTunnelkitEmitter };
