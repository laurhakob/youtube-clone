
import { db } from "@/db";
import { videos } from "@/db/schema";
import { serve } from "@upstash/workflow/nextjs";
import { and, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface InputType {
  userId: string;
  videoId: string;
}

const DESCRIPTION_SYSTEM_PROMPT = `Your task is to summarize the transcript of a video. Please follow these guidelines:
- Be brief. Condense the content into a summary that captures the key points and main ideas without losing important details.
- Avoid jargon or overly complex language unless necessary for the context.
- Focus on the most critical information, ignoring filler, repetitive statements, or irrelevant tangents.
- ONLY return the summary, no other text, annotations, or comments.
- Aim for a summary that is 3-5 sentences long and no more than 200 characters.`;

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const { POST } = serve(async (context) => {
  const input = context.requestPayload as InputType;
  const { videoId, userId } = input;

  const video = await context.run("get-video", async () => {
    const [existingVideo] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, videoId), eq(videos.userId, userId)));

    if (!existingVideo) {
      throw new Error("Not found");
    }

    return existingVideo;
  });

  // Fetch transcript from Mux
  const transcript = await context.run("get-transcript", async () => {
    const trackUrl = `https://stream.mux.com/${video.muxPlaybackId}/text/${video.muxTrackId}.txt`;
    const response = await fetch(trackUrl);

    if (!response.ok) {
      throw new Error("Failed to fetch transcript");
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error("Bad Request: Transcript is empty");
    }

    return text;
  });

  // Call Gemini AI to generate a title
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  let description = video.description; // Default to existing title if API call fails
  let status = "success"; // Track request status

  try {
    const result = await model.generateContent([
      { text: DESCRIPTION_SYSTEM_PROMPT },
      { text: transcript }, // Use fetched transcript
    ]);

    const response = await result.response;
    description = response.text().trim() || video.description;
  } catch (error) {
    console.error("Gemini API error:", error);
    status = "failed"; // Mark request as failed if error occurs
  }

  await context.run("update-video", async () => {
    await db
      .update(videos)
      .set({ description, status }) // Save status to track if request was successful or failed
      .where(and(eq(videos.id, video.id), eq(videos.userId, video.userId)));
  });

  return { description, status }; // Return status for tracking
});
