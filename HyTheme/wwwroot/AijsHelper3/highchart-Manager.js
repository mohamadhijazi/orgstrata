const CHART_SYSTEM_PROMPT = `
You are a Chart Builder AI.
Your job is to take the provided Knowledge Graph data (nodes and edges) and the user's request, and perform ETL (Extract, Transform, Load) to output a valid Highcharts configuration object.
Do NOT output any markdown other than the JSON block. Do NOT invent data.
Output strictly JSON matching this structure:
{
    "chart_title": "Descriptive Title",
    "highcharts_config": {
        // Valid Highcharts JSON object
    }
}
If data is missing or cannot be charted, output:
{ "error": "Reason why chart cannot be generated" }
`;

class HighchartManager {
    constructor() {
        this.activeWorkspaceId = null;
    }

    setWorkspace(workspaceId) {
        this.activeWorkspaceId = workspaceId;
        this.loadExistingCharts();
    }

    async loadExistingCharts() {
        const gallery = document.getElementById('charts-gallery');
        if (!gallery) return;
        gallery.innerHTML = '';
        
        try {
            const charts = await kgManager.dbGetAll('charts');
            charts.sort((a, b) => b.created_at - a.created_at).forEach(chart => {
                this.renderChartToDOM(chart.id, chart.config);
            });
        } catch (e) {
            console.error("Failed to load charts:", e);
        }
    }

    renderChartToDOM(chartId, config) {
        const gallery = document.getElementById('charts-gallery');
        
        const container = document.createElement('div');
        container.className = 'chart-container glass-panel';
        container.style.padding = '1rem';
        container.style.marginBottom = '1.5rem';
        container.style.borderRadius = '12px';
        container.id = chartId;
        
        gallery.prepend(container);
        
        // Render Highcharts
        Highcharts.chart(chartId, config);
    }

    async generateChart(query) {
        const apiKey = localStorage.getItem('llm_api_key');
        if (!apiKey) {
            alert("Please set your API Key in settings first.");
            return;
        }

        const btn = document.getElementById('btn-request-chart');
        const originalText = btn.textContent;
        btn.textContent = "Processing ETL & Charting...";
        btn.disabled = true;

        try {
            const context = await kgManager.getContextForAI();
            
            const apiMessages = [
                { role: 'system', content: CHART_SYSTEM_PROMPT + "\n\nGraph Context:\n" + JSON.stringify(context) },
                { role: 'user', content: query }
            ];

            const res = await fetch('https://llm-platform.openai.ai/api/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'innovationjsws',
                    messages: apiMessages,
                    temperature: 0.1
                })
            });

            if (!res.ok) throw new Error("API Response Error: " + res.status);
            const data = await res.json();
            const aiText = data.choices[0].message.content;

            const jsonMatch = aiText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON returned from AI");

            const parsed = JSON.parse(jsonMatch[0]);
            
            if (parsed.error) {
                alert("AI could not generate chart: " + parsed.error);
                return;
            }

            // Save to DB
            const chartId = 'chart_' + Date.now();
            const chartRecord = {
                id: chartId,
                title: parsed.chart_title || query,
                config: parsed.highcharts_config,
                created_at: Date.now()
            };
            
            await kgManager.dbPut('charts', chartRecord);
            
            // Render
            this.renderChartToDOM(chartId, chartRecord.config);

        } catch (error) {
            console.error(error);
            alert("Error generating chart. Check console for details.");
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Global instance
const highchartManager = new HighchartManager();

// Wire up the button in DOM
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-request-chart');
    if (btn) {
        btn.addEventListener('click', () => {
            const query = prompt("What would you like to visualize? (e.g., 'Show me a bar chart of all nodes by type')");
            if (query) {
                highchartManager.generateChart(query);
            }
        });
    }
});
