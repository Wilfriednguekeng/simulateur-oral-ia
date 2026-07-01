export async function POST(request: Request) {
  try {
    const { messages, systemPrompt } = await request.json();
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_tokens: 512,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "Reponse vide de Groq" }, { status: 500 });
    return Response.json({ content });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
