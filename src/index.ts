import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoTunnelkit.web.ts
// and on native platforms to ExpoTunnelkit.ts
import ExpoTunnelkitModule from './ExpoTunnelkitModule';
import ExpoTunnelkitView from './ExpoTunnelkitView';
import { ChangeEventPayload, ExpoTunnelkitViewProps } from './ExpoTunnelkit.types';

// Get the native constant value.
export const PI = ExpoTunnelkitModule.PI;

export function hello(): string {
  return ExpoTunnelkitModule.hello();
}

export async function setValueAsync(value: string) {
  return await ExpoTunnelkitModule.setValueAsync(value);
}

const emitter = new EventEmitter(ExpoTunnelkitModule ?? NativeModulesProxy.ExpoTunnelkit);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ExpoTunnelkitView, ExpoTunnelkitViewProps, ChangeEventPayload };
