export {};

declare global {
	type FirewallStatus = {
		supported: boolean;
		allowed: boolean;
		ruleName: string;
		port: number;
		reason?: string;
	};

	interface Window {
		desktopWindow: {
			minimize(): Promise<void>;
			maximize(): Promise<void>;
			close(): Promise<void>;
			isMaximized(): Promise<boolean>;
			firewallStatus(): Promise<FirewallStatus>;
			allowFirewall(): Promise<FirewallStatus>;
			saveFile(payload: {
				defaultPath: string;
				filters: Array<{ name: string; extensions: string[] }>;
				base64: string;
			}): Promise<{ saved: boolean; path: string }>;
		};
	}
}
