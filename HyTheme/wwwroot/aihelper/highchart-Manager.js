const CHART_SYSTEM_PROMPT = `
You are a Chart Builder AI.
Your job is to take the provided Knowledge Graph data (nodes and edges) and the user's request, and perform ETL (Extract, Transform, Load) to output a valid Highcharts configuration object.
Do NOT output any markdown other than the JSON block. Do NOT invent data. makesure that json attributes and structure strictly follow Highcharts documentation. 
All json properties in double quotes. Keys must be in camelCase. Follow Highcharts config structure precisely.
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
const AI_API_URL = '/api/chat/stream';
const AI_MODEL = 'orgstrata'; // Using the model from instructions


            const res = await fetch(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer sk-96f268d1b15a439eb5793e1daabf6277`
                },
                body: JSON.stringify({
                    model: AI_MODEL,
                    messages: apiMessages,
                    temperature: 0.1
                })
            });

            if (!res.ok) throw new Error("API Response Error: " + res.status);
           // const data = await res.json();
            //const aiText = data.choices[0].message.content;
const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');    
                var aiText="";             
 while (true) {

                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });                      

                    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

                    for (const line of lines) {
                        const jsonStr = line.replace(/^data:\s*/, '');

                        if (jsonStr === '[DONE]') continue;
                        try {

                            const data = JSON.parse(jsonStr);

                            const content = data.choices?.[0]?.delta?.content || '';   
                            aiText += content;            

			//this.aiResponse =fullResponse;

                        } catch (err) {

                            console.error('Error parsing chunk:', err);

                        }

                    }

                }
console.log("Full AI Response:", aiText);
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
