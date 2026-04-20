/**
 * Censtudy Content Exporter (JSON Only)
 * 
 * Paste this into your Chrome console while logged into Censtudy.
 * No external libraries needed.
 */
(async () => {
    console.log("%c🚀 Starting Censtudy JSON Export...", "color: #2563eb; font-weight: bold; font-size: 14px;");

    const API_BASE = window.location.origin;
    
    const apiFetch = async (path) => {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) throw new Error(`Failed to fetch ${path}`);
        return res.json();
    };

    try {
        console.log("📚 Fetching courses...");
        const courses = await apiFetch("/api/courses");
        const exportData = {
            version: "1.0",
            source: "Censtudy Export",
            timestamp: new Date().toISOString(),
            courses: []
        };

        for (const course of courses) {
            console.log(`  - Processing course: ${course.title}`);
            const fullCourse = { 
                title: course.title,
                description: course.description,
                units: [] 
            };
            
            const units = await apiFetch(`/api/courses/${course.id}/units`);
            for (const unit of units) {
                console.log(`    - Processing unit: ${unit.title}`);
                const fullUnit = { 
                    title: unit.title,
                    description: unit.description,
                    order_index: unit.order_index,
                    content: [], 
                    resources: [] 
                };
                
                const content = await apiFetch(`/api/units/${unit.id}/content`);
                fullUnit.content = content.map(c => ({
                    content_type: c.content_type,
                    title: c.title,
                    studyml_content: c.studyml_content
                }));

                const resources = await apiFetch(`/api/units/${unit.id}/resources`);
                fullUnit.resources = resources.map(r => ({
                    resource_type: r.resource_type,
                    title: r.title,
                    url: r.url
                }));

                fullCourse.units.push(fullUnit);
            }

            exportData.courses.push(fullCourse);
        }

        // Trigger Download
        const fileName = `censtudy_data_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();

        console.log(`%c✅ Export Complete! Saved as ${fileName}`, "color: #059669; font-weight: bold;");

    } catch (err) {
        console.error("%c❌ Export Failed", "color: #dc2626; font-weight: bold;", err);
    }
})();
