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
        max_tokens: 1024,
        temperature: 0.7
      })
    });
    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data).slice(0, 200));
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("Pas de contenu:", data);
      return Response.json({ error: "Reponse vide de Groq" }, { status: 500 });
    }
    return Response.json({ content });
  } catch (error: any) {
    console.error("Erreur:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
