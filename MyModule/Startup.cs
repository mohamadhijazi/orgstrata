using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using OrchardCore.Modules;

using HyModule.Api.Endpoints;
namespace MyModule;

public sealed class Startup : StartupBase
{
    public override void ConfigureServices(IServiceCollection services)
    {
        services.AddAuthorization(options =>
{
    // Define custom policies if needed
    options.AddPolicy("RequireContribute", policy => policy.RequireRole("Contributor", "Administrator"));
});
       
    }

    public override void Configure(IApplicationBuilder builder, IEndpointRouteBuilder routes, IServiceProvider serviceProvider)
    {
        routes.MapAreaControllerRoute(
            name: "Home",
            areaName: "MyModule",
            pattern: "Home/Index",
            defaults: new { controller = "Home", action = "Index" }
        );

        routes.AddCreateContentEndpoint();
    }
}

