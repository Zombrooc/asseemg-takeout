import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from "electron";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase } from "./db";
import { allowFirewall, getFirewallStatus } from "./firewall";
import { createTakeoutServer, startTakeoutServer } from "./server";

let mainWindow: BrowserWindow | null = null;
let takeoutServer: ReturnType<typeof createTakeoutServer> | null = null;

// Chromium's GPU path is the better default for the renderer. Keep an escape
// hatch for machines with a known driver issue without penalising every user.
if (process.env.ELECTRON_DISABLE_HARDWARE_ACCELERATION === "1")
	app.disableHardwareAcceleration();

function isTrustedRenderer(event: IpcMainInvokeEvent): boolean {
	if (!mainWindow || event.sender !== mainWindow.webContents) return false;
	const senderUrl = event.senderFrame?.url ?? "";
	if (!senderUrl) return false;

	if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
		try {
			return new URL(senderUrl).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin;
		} catch {
			return false;
		}
	}
	return senderUrl.startsWith("file://");
}

function assertTrustedRenderer(event: IpcMainInvokeEvent): void {
	if (!isTrustedRenderer(event)) throw new Error("Untrusted renderer");
}

function isAllowedRendererUrl(url: string): boolean {
	if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
		try {
			return new URL(url).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin;
		} catch {
			return false;
		}
	}
	return url.startsWith("file://");
}

function rendererContentSecurityPolicy(): string {
	const styleSource = app.isPackaged ? "'self'" : "'self' 'unsafe-inline'";
	const devConnections = app.isPackaged
		? ""
		: " ws://localhost:* ws://127.0.0.1:*";
	return [
		"default-src 'self'",
		`connect-src 'self' http://127.0.0.1:5555 http://localhost:5555 ws://127.0.0.1:5555 ws://localhost:5555${devConnections}`,
		"img-src 'self' data:",
		`style-src ${styleSource}`,
		"script-src 'self'",
	].join("; ");
}

function registerWindowIpc(): void {
	ipcMain.handle("window:minimize", (event) => {
		assertTrustedRenderer(event);
		return mainWindow?.minimize();
	});
	ipcMain.handle("window:maximize", (event) => {
		assertTrustedRenderer(event);
		if (!mainWindow) return;
		if (mainWindow.isMaximized()) mainWindow.unmaximize();
		else mainWindow.maximize();
	});
	ipcMain.handle("window:close", (event) => {
		assertTrustedRenderer(event);
		return mainWindow?.close();
	});
	ipcMain.handle(
		"window:is-maximized",
		(event) => {
			assertTrustedRenderer(event);
			return mainWindow?.isMaximized() ?? false;
		},
	);
	ipcMain.handle("firewall:status", (event) => {
		assertTrustedRenderer(event);
		return getFirewallStatus();
	});
	ipcMain.handle("firewall:allow", (event) => {
		assertTrustedRenderer(event);
		return allowFirewall();
	});
	ipcMain.handle(
		"file:save-base64",
		async (
			event,
			payload: {
				defaultPath: string;
				filters: Array<{ name: string; extensions: string[] }>;
				base64: string;
			},
		) => {
			assertTrustedRenderer(event);
			if (!payload || typeof payload.base64 !== "string")
				throw new Error("Invalid file payload");
			const options = {
				defaultPath: payload.defaultPath,
				filters: payload.filters,
			};
			const result = mainWindow
				? await dialog.showSaveDialog(mainWindow, options)
				: await dialog.showSaveDialog(options);
			if (result.canceled || !result.filePath) return { saved: false, path: "" };
			await writeFile(result.filePath, Buffer.from(payload.base64, "base64"));
			return { saved: true, path: result.filePath };
		},
	);
}

async function createMainWindow(): Promise<void> {
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1100,
		minHeight: 700,
		frame: false,
		titleBarStyle: "hidden",
		backgroundColor: "#f7f4ef",
		icon: join(app.getAppPath(), "assets/icon.png"),
		show: false,
		webPreferences: {
			preload: join(__dirname, "../preload/index.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	mainWindow.webContents.on("will-navigate", (event, url) => {
		if (!isAllowedRendererUrl(url)) event.preventDefault();
	});
	mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
	mainWindow.webContents.session.webRequest.onHeadersReceived(
		{ urls: ["*://*/*", "file://*/*"] },
		(details, callback) => {
			callback({
				responseHeaders: {
					...details.responseHeaders,
					"Content-Security-Policy": [rendererContentSecurityPolicy()],
				},
			});
		},
	);

	mainWindow.webContents.on(
		"did-fail-load",
		(_event, errorCode, errorDescription, validatedURL) => {
			console.error("Renderer failed to load", {
				errorCode,
				errorDescription,
				validatedURL,
			});
		},
	);
	mainWindow.webContents.on("render-process-gone", (_event, details) => {
		console.error("Renderer process exited", details);
	});

	mainWindow.once("ready-to-show", () => mainWindow?.show());
	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	if (process.env.ELECTRON_RENDERER_URL)
		await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	else await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

async function bootstrap(): Promise<void> {
	const db = openDatabase(join(app.getPath("userData"), "takeout.db"));
	takeoutServer = createTakeoutServer({ db });
	await startTakeoutServer(takeoutServer);
	registerWindowIpc();
	await createMainWindow();
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (!mainWindow) return;
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	});
	app
		.whenReady()
		.then(bootstrap)
		.catch((caught) => {
			console.error("Failed to start ASSEEMG Retira", caught);
			app.quit();
		});
	app.on("before-quit", () => {
		void takeoutServer?.close();
	});
	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") app.quit();
	});
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
	});
}
