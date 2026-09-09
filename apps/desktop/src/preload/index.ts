import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktopWindow", {
	minimize: () => ipcRenderer.invoke("window:minimize"),
	maximize: () => ipcRenderer.invoke("window:maximize"),
	close: () => ipcRenderer.invoke("window:close"),
	isMaximized: () =>
		ipcRenderer.invoke("window:is-maximized") as Promise<boolean>,
	firewallStatus: () => ipcRenderer.invoke("firewall:status"),
	allowFirewall: () => ipcRenderer.invoke("firewall:allow"),
});
