import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase } from "./db";
import { allowFirewall, getFirewallStatus } from "./firewall";
import { createTakeoutServer, startTakeoutServer } from "./server";

let mainWindow: BrowserWindow | null = null;
let takeoutServer: ReturnType<typeof createTakeoutServer> | null = null;

app.disableHardwareAcceleration();

function registerWindowIpc(): void {
	ipcMain.handle("window:minimize", () => mainWindow?.minimize());
	ipcMain.handle("window:maximize", () => {
		if (!mainWindow) return;
		if (mainWindow.isMaximized()) mainWindow.unmaximize();
		else mainWindow.maximize();
	});
	ipcMain.handle("window:close", () => mainWindow?.close());
	ipcMain.handle(
		"window:is-maximized",
		() => mainWindow?.isMaximized() ?? false,
	);
	ipcMain.handle("firewall:status", () => getFirewallStatus());
	ipcMain.handle("firewall:allow", () => allowFirewall());
	ipcMain.handle(
		"file:save-base64",
		async (
			_event,
			payload: {
				defaultPath: string;
				filters: Array<{ name: string; extensions: string[] }>;
				base64: string;
			},
		) => {
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
			preload: join(__dirname, "../preload/index.mjs"),
			contextIsolation: true,
			nodeIntegration: false,
			// electron-vite emits the preload as an ESM file. Sandboxed
			// preloads cannot use ESM imports, so keep the renderer isolated
			// while allowing this preload to be evaluated.
			sandbox: false,
		},
	});

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
