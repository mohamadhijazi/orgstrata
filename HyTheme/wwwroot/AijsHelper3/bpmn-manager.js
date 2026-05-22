class BpmnManager {
    constructor() {
        this.modeler = null;
    }

    init() {
        this.modeler = new BpmnJS({
            container: '#bpmn-container',
            keyboard: {
                bindTo: window
            }
        });

        document.getElementById('btn-save-bpmn').addEventListener('click', () => this.saveToDB());
        document.getElementById('btn-export-bpmn').addEventListener('click', () => this.exportXml());
    }

    async loadFromDB() {
        try {
            const data = await kgManager.getBpmnXml();
            if (data && data.xml) {
                await this.modeler.importXML(data.xml);
            } else {
                const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
                await this.modeler.importXML(defaultXml);
            }
        } catch (err) {
            console.error("Error loading BPMN from DB", err);
        }
    }

    async saveToDB() {
        try {
            const { xml } = await this.modeler.saveXML({ format: true });
            await kgManager.saveBpmnXml(xml);
            alert("BPMN saved to Workspace DB.");
        } catch (err) {
            console.error("Error saving BPMN", err);
            alert("Error saving BPMN.");
        }
    }

    async exportXml() {
        try {
            const { xml } = await this.modeler.saveXML({ format: true });
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diagram.bpmn';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error exporting BPMN", err);
        }
    }

    async applyAiGeneratedXml(xml) {
        try {
            await this.modeler.importXML(xml);
            await this.saveToDB(); 
        } catch (err) {
            console.error("Error applying AI BPMN XML", err);
        }
    }
}

const bpmnManager = new BpmnManager();
