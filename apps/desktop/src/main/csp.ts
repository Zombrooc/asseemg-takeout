export function rendererContentSecurityPolicy(isPackaged: boolean): string {
	const styleSource = isPackaged ? "'self'" : "'self' 'unsafe-inline'";
	const devConnections = isPackaged
		? ""
		: " ws://localhost:* ws://127.0.0.1:*";
	const devScripts = isPackaged
		? ""
		: " 'unsafe-inline' http://localhost:* http://127.0.0.1:*";

	return [
		"default-src 'self'",
		`connect-src 'self' http://127.0.0.1:5555 http://localhost:5555 ws://127.0.0.1:5555 ws://localhost:5555${devConnections}`,
		"img-src 'self' data:",
		`style-src ${styleSource}`,
		`script-src 'self'${devScripts}`,
	].join("; ");
}
