class ReminderJobManager {
    constructor() {
        this.intervalId = null;
        this.activeWorkspaceId = null;
    }

    setWorkspace(workspaceId) {
        this.activeWorkspaceId = workspaceId;
    }

    start() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        console.log("Reminder job scheduler started.");
        
        // Request notification permission
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        // Check every minute
        this.intervalId = setInterval(() => {
            this.checkReminders();
        }, 60 * 1000);

        // Also check on visibility change
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                this.checkReminders();
            }
        });
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async checkReminders() {
        if (!this.activeWorkspaceId) return;
        
        try {
            const reminders = await kgManager.dbGetAll('reminders');
            const now = Date.now();

            for (let rem of reminders) {
                if (rem.status === "pending" && new Date(rem.due_date).getTime() <= now) {
                    this.triggerReminder(rem);
                    rem.status = "triggered";
                    await kgManager.dbPut('reminders', rem);
                }
            }
        } catch (e) {
            console.error("Error checking reminders:", e);
        }
    }

    triggerReminder(rem) {
        console.log("Triggering reminder:", rem);
        
        // 1. Browser Notification
        if (Notification.permission === "granted") {
            new Notification(`Reminder: ${rem.title}`, {
                body: `Workspace: ${this.activeWorkspaceId}\nClick to view details.`
            });
        }

        // 2. Chat Injection (Find active session and inject a system message)
        const chatHistoryDiv = document.getElementById('chat-history');
        if (chatHistoryDiv) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ai`;
            msgDiv.style.padding = '10px';
            msgDiv.style.margin = '10px 0';
            msgDiv.style.borderRadius = '8px';
            msgDiv.style.backgroundColor = 'var(--danger)'; // Red to highlight
            msgDiv.style.color = 'white';
            msgDiv.textContent = `🔔 AUTOMATED REMINDER: ${rem.title}. Due Date reached.`;
            
            chatHistoryDiv.appendChild(msgDiv);
            chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
        }
    }
}

// Global instance
const reminderJobManager = new ReminderJobManager();
