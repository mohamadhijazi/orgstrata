using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Settings;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using OrchardCore.ContentManagement;
using OrchardCore.ContentManagement.Handlers;
using OrchardCore.ContentManagement.Metadata;
using OrchardCore.DisplayManagement.ModelBinding;
using OrchardCore.Json;
using OrchardCore.Modules;

namespace HyModule.Api.Endpoints;

public static class ChatEndpoints
{
    public static IEndpointRouteBuilder MapChatStreaming(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/chat/stream", async context =>
        {
            context.Response.Headers.Add("Content-Type", "text/event-stream");

            using var reader = new StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync();

            // Parse request (model, messages, etc.)
            var request = JsonSerializer.Deserialize<ChatRequest>(body);

            // Prepare OpenAI request
            var http = new HttpClient();
            var openAiRequest = new HttpRequestMessage(HttpMethod.Post,
                "http://localhost:3000/api/chat/completions");

            openAiRequest.Headers.Authorization =
                new AuthenticationHeaderValue("Bearer", "sk-96f268d1b15a439eb5793e1daabf6277");

            var payload = new
            {
                model ="orgstrata",
                stream = true,
                messages = request.messages
            };

            openAiRequest.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            using var response = await http.SendAsync(
                openAiRequest,
                HttpCompletionOption.ResponseHeadersRead);

            using var stream = await response.Content.ReadAsStreamAsync();
            using var streamReader = new StreamReader(stream);

            while (!streamReader.EndOfStream)
            {
                var line = await streamReader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line))
                    continue;

                if (line.StartsWith("data: "))
                    line = line.Substring("data: ".Length);

                if (line == "[DONE]")
                    break;

                await context.Response.WriteAsync($"data: {line}\n\n");
                await context.Response.Body.FlushAsync();
            }
        });

        return endpoints;
    }
}

public class ChatRequest
{
    public string model { get; set; }
    public object[] messages { get; set; }
}