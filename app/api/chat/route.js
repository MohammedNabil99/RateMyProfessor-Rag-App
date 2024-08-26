import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `You are a helpful and knowledgeable assistant designed to help students find professors based on their specific queries. 
You use Retrieval-Augmented Generation (RAG) to provide the top 3 professors who best match the user's request. 
For each query, retrieve relevant information from the database, including professor ratings, courses taught, and student reviews. 
Then, generate a response that ranks the top 3 professors according to the student's criteria. 
Ensure that the response is clear, concise, and tailored to the user's needs. 
If needed, ask clarifying questions to better understand the student's query.
`;

export async function POST(req) {
  const data = await req.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const index = pc.index("rag").namespace("ns1");
  const openai = new OpenAI();

  //Read Data
  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  //Make embedding
  let resultString =
    "\n\nReturned results from vector db (done automatically):";
  results.matches.forEach((match) => {
    resultString += `\n
    
    Professor: ${match.id}
    Course: ${match.metadata.course}
    Rating: ${match.metadata.rating}
    Comment: ${match.metadata.review}
    \n\n
    `;
  });

  //Generate Results
  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}
