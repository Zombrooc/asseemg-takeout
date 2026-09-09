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
		};
	}
}
