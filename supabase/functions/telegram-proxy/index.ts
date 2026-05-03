const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TelegramRequest {
  botToken: string;
  method: string;
  params?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log('Received request:', { method: body.method, hasToken: !!body.botToken });

    const { botToken, method, params }: TelegramRequest = body;

    if (!botToken) {
      console.error('Missing bot token');
      return new Response(
        JSON.stringify({ ok: false, description: "Bot token is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!method) {
      console.error('Missing method');
      return new Response(
        JSON.stringify({ ok: false, description: "Method is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`;
    console.log('Calling Telegram API:', method);

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params || {}),
    });

    const result = await response.json();
    console.log('Telegram API response:', { ok: result.ok, status: response.status });

    // Always return 200 from the edge function
    // The actual Telegram API result (ok: true/false) is in the response body
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error proxying Telegram request:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        description: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});