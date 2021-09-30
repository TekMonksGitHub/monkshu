/**
 * Main entry point. ElectronJS/Monkshu native.
 * (C) TekMonks. All rights reserved.
 * License: See enclosed LICENSE file.
 */
const fs = require("fs");
const path = require("path");
global.CONSTANTS = require(`${__dirname}/lib/constants.js`);
const log = require(`${CONSTANTS.LIBDIR}/log.js`);
const config = require(`${CONSTANTS.LIBDIR}/config.js`);
const appconf = require(`${_getMainAppPath()}/conf/application.json`);
const { app, BrowserWindow, Menu, shell, Tray, ipcMain, nativeImage } = require("electron");

const isMac = process.platform === "darwin";
const menuTemplate = [
	...(isMac ? [{label: app.name, submenu: [{ role: "about" }, { type: "separator" }, { role: "services" }, 
		{ type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, 
		{ type: "separator" }, { role: "quit" }]}] : []),
	{label: "File", submenu: [{ role: "quit" }]},
	{role: "help", submenu: [{label: "Learn More", click: async () => {shell.openExternal(appconf.homepage)}}]}
];

function _getMainAppPath() {
	const entries = fs.readdirSync(`${CONSTANTS.ROOTDIR}/../app/`);
	return path.resolve(`${CONSTANTS.ROOTDIR}/../app/${entries[0]}`);
}

function createWindow () {
	const logoImage = nativeImage.createFromPath(`${_getMainAppPath()}/${appconf.logo}`);

	const mainWindow = new BrowserWindow({ width: 800, height: 600, frame: appconf.frame, webPreferences: { 
		nativeWindowOpen: true, preload: `${CONSTANTS.LIBDIR}/preload.js`}, contextIsolation: true, 
		icon: logoImage });
	if (!appconf.frame) mainWindow.removeMenu();
	if (config.get("__electron_test_bounds")) mainWindow.setBounds(config.get("__electron_test_bounds"));
	mainWindow.on("close", _=>config.set("__electron_test_bounds", mainWindow.getBounds()));

	if (appconf.file) mainWindow.loadFile(`${_getMainAppPath()}/${appconf.file}`);
	else if (appconf.url) mainWindow.loadURL(appconf.url);
	else {LOG.error("No lauch command specified, exiting."); process.exit(1);}

	new Tray(logoImage.resize({width:16, height:16})).setToolTip(appconf.apptooltip);
	app.setAppUserModelId(appconf.appid);
}

function initSync() {
	const appFilesDir = `${CONSTANTS.DATADIR}/${appconf.appid}`;
	if (!fs.existsSync(appFilesDir)) try {	// create root app data dir
		fs.mkdirSync(appFilesDir, {recursive: true}); } catch(err) {};

	log.initGlobalLoggerSync(`${appFilesDir}/log.ndjson`); LOG.overrideConsole();
	config.initSync(appconf.appid);

	const menu = Menu.buildFromTemplate(menuTemplate)
	Menu.setApplicationMenu(menu)

	app.whenReady().then(_=>createWindow());
	
	app.on("activate", _=> {if (BrowserWindow.getAllWindows().length == 0) createWindow();});
	app.on("window-all-closed", _=> app.quit());

	// add in IPC functions
	ipcMain.on("api", (event, args) => {
		const electron = require("electron");	// this allows calling Electron APIs below
		const apiName = args[0], funcPointer = eval(`${apiName}`), funcArgs = args.slice(1), 
			funcContextName = apiName.split(".").slice(0, -1).join("."), 
			funcContext = funcContextName == apiName ? null : eval(funcContextName);
		if (funcPointer) {
			const reply = typeof funcPointer == "function" ? funcPointer.apply(funcContext, funcArgs) : funcPointer;
			try {event.returnValue = {result: true, reply}} catch (err) {
				LOG.error(`Error calling API ${apiName}, error is: ${err}`);
				event.returnValue = {result: false, error: err}; 
			}
		} else {
			LOG.error(`Error calling API ${apiName}, error is: Unknown API ${apiName}`);
			event.returnValue = {result: false, error: `Unknown API ${apiName}`};
		}
	});

	ipcMain.handle("apiAsync", async (_event, args) => {
		const electron = require("electron");	// this allows calling Electron APIs below
		const apiName = args[0], funcPointer = eval(`${apiName}`), funcArgs = args.slice(1), 
			funcContextName = apiName.split(".").slice(0, -1).join("."), 
			funcContext = funcContextName == apiName ? null : eval(funcContextName);
		if (funcPointer && typeof funcPointer == "function") {
			const reply = typeof funcPointer == "function" ? await funcPointer.apply(funcContext, funcArgs) : funcPointer;
			try {return {result: true, reply}} catch (err) {
				LOG.error(`Error calling API ${apiName}, error is: ${err}`);
				return {result: false, error: err};
			}
		} else {
			LOG.error(`Error calling API ${apiName}, error is: Unknown API ${apiName}`);
			return {result: false, error: `Unknown API ${apiName}`};
		}
	});
}

initSync();