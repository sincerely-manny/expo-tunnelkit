export const ExpoTunnelkitError = {
  dnsFailure: 'Socket endpoint could not be resolved.',
  exhaustedProtocols: 'No more protocols available to try.',
  socketActivity: 'Socket failed to reach active state.',
  authentication: 'Credentials authentication failed.',
  tlsInitialization:
    'TLS could not be initialized (e.g. malformed CA or client PEMs).',
  tlsServerVerification: 'TLS server verification failed.',
  tlsHandshake: 'TLS handshake failed.',
  encryptionInitialization:
    'The encryption logic could not be initialized (e.g. PRNG, algorithms).',
  encryptionData: 'Data encryption/decryption failed.',
  lzo: 'The LZO engine failed.',
  serverCompression: 'Server uses an unsupported compression algorithm.',
  timeout: 'Tunnel timed out.',
  linkError: 'An error occurred at the link level.',
  routing: 'Network routing information is missing or incomplete.',
  networkChanged:
    'The current network changed (e.g. switched from WiFi to data connection).',
  gatewayUnattainable: 'Default gateway could not be attained.',
  unexpectedReply: 'The server replied in an unexpected way.',
} as const;
