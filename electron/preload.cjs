const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("receiptApp", {
  getAppName: () => "ReceiptPro",
  getAppVersion: () => "1.0.0",
  createReceipt: (data) => ipcRenderer.invoke("receipts:create", data),
  getReceipts: (search = "") => ipcRenderer.invoke("receipts:list", search),
  printReceipt: (receipt) => ipcRenderer.invoke("receipts:print", receipt),
  saveReceiptPdf: (receipt) => ipcRenderer.invoke("receipts:save-pdf", receipt),
  deleteAllReceipts: () =>
    ipcRenderer.invoke("receipts:delete-all-once"),
});
