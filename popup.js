// State
let logsVisible = false;
let dashboardVisible = false;
let allLogs = [];

// Error logging
function logError(context, error) {
    console.error(`[Popup Error - ${context}]:`, error);
    alert(`Error: ${error.message || 'Something went wrong'}`);
}

// Show loading state
function setLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = isLoading;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Loading...';
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
        }
    }
}

// Calculate statistics from logs
function calculateStats(logs) {
    const stats = {
        totalEvents: logs.length,
        tabSwitches: 0,
        pasteEvents: 0,
        keystrokeBatches: 0,
        idleEvents: 0,
        sessionStart: null,
        sessionEnd: null,
        problems: new Set(),
        eventTypes: {}
    };

    logs.forEach(log => {
        // Count event types
        stats.eventTypes[log.e] = (stats.eventTypes[log.e] || 0) + 1;

        // Track specific events
        if (log.e === 'tab_switch') stats.tabSwitches++;
        if (log.e === 'paste') stats.pasteEvents++;
        if (log.e === 'keystroke_batch' || log.e === 'keystroke') stats.keystrokeBatches++;
        if (log.e === 'idle_detected' || log.e === 'idle') stats.idleEvents++;

        // Track problems
        if (log.problem && log.problem !== 'unknown') {
            stats.problems.add(log.problem);
        }

        // Track session times
        if (!stats.sessionStart || log.timestamp < stats.sessionStart) {
            stats.sessionStart = log.timestamp;
        }
        if (!stats.sessionEnd || log.timestamp > stats.sessionEnd) {
            stats.sessionEnd = log.timestamp;
        }
    });

    return stats;
}

// Generate alerts based on statistics
function generateAlerts(stats) {
    const alerts = [];

    if (stats.pasteEvents > 10) {
        alerts.push({
            type: 'danger',
            message: `High paste count: ${stats.pasteEvents} pastes detected`
        });
    } else if (stats.pasteEvents > 5) {
        alerts.push({
            type: 'warning',
            message: `Moderate paste activity: ${stats.pasteEvents} pastes`
        });
    }

    if (stats.tabSwitches > 15) {
        alerts.push({
            type: 'danger',
            message: `Excessive tab switching: ${stats.tabSwitches} switches`
        });
    } else if (stats.tabSwitches > 8) {
        alerts.push({
            type: 'warning',
            message: `Frequent tab switching: ${stats.tabSwitches} switches`
        });
    }

    if (stats.idleEvents > 5) {
        alerts.push({
            type: 'warning',
            message: `Multiple idle periods detected: ${stats.idleEvents}`
        });
    }

    if (alerts.length === 0) {
        alerts.push({
            type: 'info',
            message: 'No suspicious behavior detected'
        });
    }

    return alerts;
}

// Format time duration
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

// Render dashboard
function renderDashboard(logs) {
    const stats = calculateStats(logs);
    const alerts = generateAlerts(stats);

    // Update stat cards
    document.getElementById('totalEvents').textContent = stats.totalEvents;
    document.getElementById('tabSwitches').textContent = stats.tabSwitches;
    document.getElementById('pasteEvents').textContent = stats.pasteEvents;

    // Calculate session duration
    if (stats.sessionStart && stats.sessionEnd) {
        const duration = stats.sessionEnd - stats.sessionStart;
        document.getElementById('sessionTime').textContent = formatDuration(duration);
    } else {
        document.getElementById('sessionTime').textContent = '0m';
    }

    // Render alerts
    const alertsContainer = document.getElementById('alertsContainer');
    alertsContainer.innerHTML = '';
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alert.type}`;
        alertDiv.textContent = alert.message;
        alertsContainer.appendChild(alertDiv);
    });

    // Render event distribution chart
    const chartContainer = document.getElementById('eventChart');
    chartContainer.innerHTML = '';

    const eventEntries = Object.entries(stats.eventTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 events

    const maxCount = Math.max(...eventEntries.map(e => e[1]));

    eventEntries.forEach(([eventType, count]) => {
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';

        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = eventType;

        const barFill = document.createElement('div');
        barFill.className = 'bar-fill';
        const percentage = (count / maxCount) * 100;
        barFill.style.width = `${percentage}%`;

        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = count;

        barItem.appendChild(label);
        barItem.appendChild(barFill);
        barItem.appendChild(value);
        chartContainer.appendChild(barItem);
    });

    document.getElementById('chartContainer').classList.add('visible');
}

// Show Dashboard
document.getElementById("showDashboard").addEventListener("click", async () => {
    if (dashboardVisible) {
        document.getElementById('dashboard').classList.remove('visible');
        dashboardVisible = false;
        return;
    }

    setLoading("showDashboard", true);

    try {
        const data = await chrome.storage.local.get("logs");
        allLogs = data.logs || [];

        if (allLogs.length === 0) {
            alert("No data to display. Start a coding session first!");
            return;
        }

        renderDashboard(allLogs);
        document.getElementById('dashboard').classList.add('visible');
        dashboardVisible = true;
    } catch (error) {
        logError('showDashboard', error);
    } finally {
        setLoading("showDashboard", false);
    }
});
function populateFilters(logs){
  const eventTypes = new Set();
  const problems = new Set();

  logs.forEach(log => {
        if (log.e) eventTypes.add(log.e);
        if (log.problem && log.problem !== 'unknown' && log.problem !== 'error-getting-name') {
            problems.add(log.problem);
        }
    });
  
  const eventTypeFilter = document.getElementById('eventTypeFilter');
  eventTypeFilter.innerHTML = '<option value="all">All Events</option>';
  Array.from(eventTypes).sort().forEach(eventType => {
      const option = document.createElement('option');
      option.value = eventType;
      option.textContent = eventType;
      eventTypeFilter.appendChild(option);
  });

  const problemFilter = document.getElementById('problemFilter');
  problemFilter.innerHTML = '<option value="all">All Problems</option>';
  Array.from(problems).sort().forEach(problem => {
      const option = document.createElement('option');
      option.value = problem;
      option.textContent = problem;
      problemFilter.appendChild(option);
  });
}
function filterLogs(logs) {
    const eventTypeFilter = document.getElementById('eventTypeFilter').value;
    const problemFilter = document.getElementById('problemFilter').value;

    return logs.filter(log => {
        const matchesEventType = eventTypeFilter === 'all' || log.e === eventTypeFilter;
        const matchesProblem = problemFilter === 'all' || log.problem === problemFilter;
        return matchesEventType && matchesProblem;
    });
}

// Render logs to the list
function renderLogs(logs) {
    const list = document.getElementById("logList");
    list.innerHTML = "";

    if (logs.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No logs match the current filters";
        item.style.color = "#888";
        list.appendChild(item);
        return;
    }

    // Show last 100 logs
    const logsToShow = logs.slice(-100);

    logsToShow.forEach(log => {
        const item = document.createElement("li");
        const time = new Date(log.timestamp).toLocaleTimeString();
        const problem = log.problem ? ` (${log.problem})` : '';
        item.textContent = `${log.e} at ${time}${problem}`;

        // Color code suspicious events
        if (log.e === 'paste') {
            item.classList.add('danger');
        } else if (log.e === 'tab_switch' || log.e === 'idle_detected') {
            item.classList.add('warning');
        }

        list.appendChild(item);
    });

    if (logs.length > 100) {
        const notice = document.createElement("li");
        notice.textContent = `... and ${logs.length - 100} more (export to see all)`;
        notice.style.color = "#888";
        notice.style.fontStyle = "italic";
        list.appendChild(notice);
    }
}

// Show/Hide Logs
document.getElementById("showLogs").addEventListener("click", async () => {
    const list = document.getElementById("logList");
    const button = document.getElementById("showLogs");
    const filterSection = document.getElementById("filterSection");

    if (!logsVisible) {
        setLoading("showLogs", true);

        try {
            const data = await chrome.storage.local.get("logs");
            allLogs = data.logs || [];

            if (allLogs.length === 0) {
                list.innerHTML = "";
                const item = document.createElement("li");
                item.textContent = "No logs yet";
                item.style.color = "#888";
                list.appendChild(item);
            } else {
                // Populate filter dropdowns
                populateFilters(allLogs);

                // Render logs
                const filteredLogs = filterLogs(allLogs);
                renderLogs(filteredLogs);
            }

            requestAnimationFrame(() => {
                list.classList.add("showing");
            });

            logsVisible = true;
            button.textContent = "Hide Logs";
            filterSection.style.display = "flex";
        } catch (error) {
            logError('showLogs', error);
        } finally {
            setLoading("showLogs", false);
        }
    } else {
        list.classList.remove("showing");
        setTimeout(() => {
            list.innerHTML = "";
        }, 300);
        logsVisible = false;
        button.textContent = "Show Logs";
        filterSection.style.display = "none";
    }
});

// Event type filter change handler
document.getElementById('eventTypeFilter').addEventListener('change', () => {
    if (logsVisible && allLogs.length > 0) {
        const filteredLogs = filterLogs(allLogs);
        renderLogs(filteredLogs);
    }
});

// Problem filter change handler
document.getElementById('problemFilter').addEventListener('change', () => {
    if (logsVisible && allLogs.length > 0) {
        const filteredLogs = filterLogs(allLogs);
        renderLogs(filteredLogs);
    }
});
// Clear Data
document.getElementById("clearData").addEventListener("click", async () => {
    if (!confirm("Are you sure you want to clear all logs? This cannot be undone.")) {
        return;
    }

    setLoading("clearData", true);

    try {
        const list = document.getElementById("logList");
        if (list) {
            list.innerHTML = "";
            list.classList.remove("showing");
        }

        document.getElementById('dashboard').classList.remove('visible');
        await chrome.storage.local.set({logs: []});
        logsVisible = false;
        dashboardVisible = false;
        document.getElementById("showLogs").textContent = "Show Logs";

        alert("Logs cleared successfully!");
    } catch (error) {
        logError('clearData', error);
    } finally {
        setLoading("clearData", false);
    }
});

// Export Logs
document.getElementById("exportLogs").addEventListener("click", async () => {
    setLoading("exportLogs", true);

    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded. Please reload the extension.');
        }

        const data = await chrome.storage.local.get("logs");
        const logs = data.logs || [];

        if (logs.length === 0) {
            alert("No logs to export!");
            return;
        }

        // Prepare data for Excel
        const header = ["Event", "Typing Speed", "Problem", "Timestamp"];
        const rows = logs.map(log => ([
            log.e || "",
            log.typingSpeed !== undefined ? log.typingSpeed : "",
            log.problem || "",
            new Date(log.timestamp).toLocaleString()
        ]));

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

        // Auto-size columns
        const colWidths = [
            {wch: 20},
            {wch: 15},
            {wch: 30},
            {wch: 25}
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");

        const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });

        const timestamp = new Date().toISOString().split('T')[0];
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `coding-assessment-logs-${timestamp}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);

        alert(`Successfully exported ${logs.length} logs!`);
    } catch (error) {
        logError('exportLogs', error);
    } finally {
        setLoading("exportLogs", false);
    }
});