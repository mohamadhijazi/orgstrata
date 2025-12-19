using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using OrchardCore.ContentManagement;
using OrchardCore.Json;
using OrchardCore.Modules;

namespace HyModule.Api.Endpoints;


public static class GetEndpoint
{
    public static IEndpointRouteBuilder AddGetContentEndpoint(this IEndpointRouteBuilder builder)
    {
        builder.MapGet("api/Hycontent/{contentItemId}", HandleAsync)
            .RequireAuthorization(policy => policy.RequireRole("Contributor", "Administrator"));            


        return builder;
    }
 
    private static async Task<IResult> HandleAsync(
        string contentItemId,
        IContentManager contentManager,
        IAuthorizationService authorizationService,
        HttpContext httpContext,
        IOptions<DocumentJsonSerializerOptions> options)
    {
        

        var contentItem = await contentManager.GetAsync(contentItemId);

        if (contentItem == null)
        {
            return TypedResults.NotFound();
        }
        
        return Results.Json(contentItem, options.Value.SerializerOptions);
    }
}