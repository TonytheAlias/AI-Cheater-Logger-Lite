let logsVisible = false;

document.getElementById("showsLogs").addEventListener("click", () => {
    
    const list = document.getElementById("logList");
    const button = document.getElementById("showsLogs");
    if(!logsVisible){
        chrome.storage.local.get("logs", data => {
        list.innerHTML = "";
        (data.logs || []).forEach(log => {
            const item = document.createElement("li");
            item.textContent = `${log.e} at ${new Date(log.timestamp).toLocaleTimeString()}`;
            list.appendChild(item);
        });
        requestAnimationFrame(() => {
      list.classList.add("showing");
        });
      logsVisible = true;
       document.getElementById("showsLogs").textContent = "Hide Logs";
        });
    } else {
     list.classList.remove("showing");
    setTimeout(() => {
      list.innerHTML = "";
    }, 300);
    logsVisible = false
    button.textContent = "Show Logs"
}
  });
  
  document.getElementById("clearData").addEventListener("click",() => {
    const list = document.getElementById("logList")
    if (list)
    {
      list.innerHTML = "";
    }
    chrome.storage.local.set({logs: []})
  })

  document.getElementById("exportLogs").addEventListener("click", () => {
    chrome.storage.local.get("logs", data => {
        const logs = data.logs || [];

        if (logs.length === 0) {
            alert("No logs to export!");
            return;
        }

       const header = ["Event", "Typing Speed", "Problem", "Timestamp"];
    const rows = logs.map(log => ([
      log.e || "",
      log.typingSpeed || "",
      log.problem || "",
      new Date(log.timestamp).toLocaleString()
    ]));

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ai_cheating_logs.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
    });
});