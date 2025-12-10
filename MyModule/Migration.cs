using System.ComponentModel;
using OrchardCore.ContentManagement.Metadata;
using OrchardCore.ContentManagement.Metadata.Settings;
using OrchardCore.Data.Migration;
using OrchardCore.ContentManagement;

namespace MyModule.Migration;

public class Migrations : DataMigration
{
    private readonly IContentDefinitionManager _contentDefinitionManager;

    public Migrations(IContentDefinitionManager contentDefinitionManager)
    {
        _contentDefinitionManager = contentDefinitionManager;
    }

    public async Task<int> CreateAsync()
    {
        // Form
        await _contentDefinitionManager.AlterPartDefinitionAsync("MyschPart", part => part
            .Attachable()
            .WithDescription("Turns your content item into a form."));

        await _contentDefinitionManager.AlterTypeDefinitionAsync("MyschForm", type => type
            .WithPart("TitlePart", part => part
                .WithSettings(new TitlePartSettings
                {
                    RenderTitle = false,
                })
                .WithPosition("0")
            )
            .WithPart("FormElementPart", part => part
                .WithPosition("1")
            )
            .WithPart("FormPart", part => part
                .WithPosition("2")
            )
            .WithPart("FlowPart", part => part
                .WithPosition("3")
            )
            .Stereotype("Widget"));

            return 1;
    }
    
     internal sealed class TitlePartSettings
    {
        public int Options { get; set; }

        public string Pattern { get; set; }

        [DefaultValue(true)]
        public bool RenderTitle { get; set; }
    }
}