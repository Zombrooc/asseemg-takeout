import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const FIREWALL_RULE_NAME = "ASSEEMG Retira API";
const FIREWALL_PORT = "5555";

export type FirewallStatus = {
	supported: boolean;
	allowed: boolean;
	ruleName: string;
	port: number;
	reason?: string;
};

function unsupported(reason: string): FirewallStatus {
	return {
		supported: false,
		allowed: true,
		ruleName: FIREWALL_RULE_NAME,
		port: Number(FIREWALL_PORT),
		reason,
	};
}

async function runNetsh(args: string[]): Promise<void> {
	await execFileAsync("netsh.exe", args, {
		windowsHide: true,
		timeout: 15_000,
	});
}

async function showRule(): Promise<boolean> {
	try {
		await runNetsh([
			"advfirewall",
			"firewall",
			"show",
			"rule",
			`name=${FIREWALL_RULE_NAME}`,
		]);
		return true;
	} catch {
		return false;
	}
}

function powershellQuote(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function runElevatedNetsh(args: string[]): Promise<void> {
	const argumentList = args.map(powershellQuote).join(", ");
	const command = `Start-Process -FilePath 'netsh.exe' -Verb RunAs -Wait -ArgumentList @(${argumentList})`;
	await execFileAsync(
		"powershell.exe",
		[
			"-NoProfile",
			"-NonInteractive",
			"-ExecutionPolicy",
			"Bypass",
			"-Command",
			command,
		],
		{ windowsHide: true, timeout: 60_000 },
	);
}

export async function getFirewallStatus(): Promise<FirewallStatus> {
	if (process.platform !== "win32")
		return unsupported("A configuração automática está disponível no Windows.");
	const allowed = await showRule();
	return {
		supported: true,
		allowed,
		ruleName: FIREWALL_RULE_NAME,
		port: Number(FIREWALL_PORT),
		reason: allowed ? undefined : "A regra de entrada não foi encontrada.",
	};
}

export async function allowFirewall(): Promise<FirewallStatus> {
	if (process.platform !== "win32")
		return unsupported("A configuração automática está disponível no Windows.");
	const program = process.execPath;
	const args = [
		"advfirewall",
		"firewall",
		"add",
		"rule",
		`name=${FIREWALL_RULE_NAME}`,
		"dir=in",
		"action=allow",
		"protocol=TCP",
		`localport=${FIREWALL_PORT}`,
		"profile=private,domain",
		`program=${program}`,
		"enable=yes",
	];
	try {
		await runElevatedNetsh(args);
		return getFirewallStatus();
	} catch (caught) {
		return {
			supported: true,
			allowed: false,
			ruleName: FIREWALL_RULE_NAME,
			port: Number(FIREWALL_PORT),
			reason:
				caught instanceof Error
					? caught.message
					: "A autorização foi cancelada.",
		};
	}
}
