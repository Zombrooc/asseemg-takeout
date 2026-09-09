export {};

declare global {
  interface Window {
    desktopWindow: {
      minimize(): Promise<void>;
      maximize(): Promise<void>;
      close(): Promise<void>;
      isMaximized(): Promise<boolean>;
      firewallStatus(): Promise<{
        supported: boolean;
        allowed: boolean;
        ruleName: string;
        port: number;
        reason?: string;
      }>;
      allowFirewall(): Promise<{
        supported: boolean;
        allowed: boolean;
        ruleName: string;
        port: number;
        reason?: string;
      }>;
    };
  }
}
