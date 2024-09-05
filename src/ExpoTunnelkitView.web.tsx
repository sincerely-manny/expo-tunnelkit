import * as React from 'react';

import { ExpoTunnelkitViewProps } from './ExpoTunnelkit.types';

export default function ExpoTunnelkitView(props: ExpoTunnelkitViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
